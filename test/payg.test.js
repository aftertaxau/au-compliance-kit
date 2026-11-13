import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateWithholding, calculateBonusWithholding, weeklyEquivalentDollars, weeklyMedicareAdjustment, weeklyStudyLoanComponent, toCents } from "../src/payg/withholding.js";
import { overtimeEarnings } from "../src/index.js";

const fixtures = JSON.parse(readFileSync(new URL("./fixtures/ato-schedule1-2026-27-samples.json", import.meta.url)));

const scaleInput = {
  scale1: { taxFreeThreshold: false },
  scale2: {},
  scale3: { foreignResident: true },
  scale5: { medicareExemption: "full" },
  scale6: { medicareExemption: "half" },
};

test("ATO sample data: withholding amounts (weekly, fortnightly, monthly; scales 1,2,3,5,6)", () => {
  const rows = fixtures.cases.filter((c) => c.kind === "withholding");
  assert.equal(rows.length, 144);
  const failures = [];
  for (const row of rows) {
    for (const [key, extra] of Object.entries(scaleInput)) {
      const got = calculateWithholding({ earnings: row.earnings, period: row.period, ...extra }).withholding;
      if (got !== row[key]) failures.push(`${row.period} ${row.earnings} ${key}: expected ${row[key]}, got ${got}`);
    }
  }
  assert.deepEqual(failures, []);
});

function periodAdjustment(scale, earnings, period, family) {
  const dollars = weeklyEquivalentDollars(toCents(earnings), period);
  const weekly = weeklyMedicareAdjustment(scale, dollars, family);
  if (period === "weekly") return weekly;
  if (period === "fortnightly") return weekly * 2;
  return Math.floor((2 * weekly * 13 + 3) / 6); // monthly: x13/3 rounded half up
}

test("ATO sample data: Medicare levy adjustment, scale 2 (spouse only and 1-5 children)", () => {
  const rows = fixtures.cases.filter((c) => c.kind === "medicare_scale2");
  assert.equal(rows.length, 144);
  const failures = [];
  for (const row of rows) {
    const spouse = periodAdjustment(2, row.earnings, row.period, { spouse: true });
    if (spouse !== row.spouseOnly) failures.push(`${row.period} ${row.earnings} spouse: expected ${row.spouseOnly}, got ${spouse}`);
    row.children.forEach((expected, i) => {
      const got = periodAdjustment(2, row.earnings, row.period, { spouse: true, children: i + 1 });
      if (got !== expected) failures.push(`${row.period} ${row.earnings} ${i + 1} children: expected ${expected}, got ${got}`);
    });
  }
  assert.deepEqual(failures, []);
});

test("ATO sample data: Medicare half-levy adjustment, scale 6 (1-5 children)", () => {
  const rows = fixtures.cases.filter((c) => c.kind === "medicare_scale6");
  assert.equal(rows.length, 144);
  const failures = [];
  for (const row of rows) {
    row.children.forEach((expected, i) => {
      const got = periodAdjustment(6, row.earnings, row.period, { spouse: true, children: i + 1 });
      if (got !== expected) failures.push(`${row.period} ${row.earnings} ${i + 1} children: expected ${expected}, got ${got}`);
    });
  }
  assert.deepEqual(failures, []);
});

test("ATO worked examples from Schedule 1", () => {
  // General example 1: weekly 1,333.45, scale 2, five children -> 245 - 26 = 219
  assert.equal(calculateWithholding({ earnings: 1333.45, period: "weekly", medicareFamily: { spouse: true, children: 5 } }).withholding, 219);
  // General example 2: fortnightly 1,299.30, scale 5, offsets 1,645 -> 86 - 63 = 23
  assert.equal(calculateWithholding({ earnings: 1299.3, period: "fortnightly", medicareExemption: "full", annualTaxOffset: 1645 }).withholding, 23);
  // General example 3: monthly 5,400.33, scale 2, offset 1,365, above SOP -> 940 - 113 = 827
  assert.equal(calculateWithholding({ earnings: 5400.33, period: "monthly", annualTaxOffset: 1365, medicareFamily: { spouse: true, children: 1 } }).withholding, 827);
  // Medicare levy adjustment examples
  assert.equal(weeklyMedicareAdjustment(2, 633, { spouse: true }), 10);
  assert.equal(weeklyMedicareAdjustment(6, 1142, { spouse: true, children: 3 }), 11);
  assert.equal(weeklyMedicareAdjustment(2, 1319, { spouse: true, children: 4 }), 19);
});

test("scale 4 (no TFN) applies flat rates ignoring cents", () => {
  assert.equal(calculateWithholding({ earnings: 1000.99, period: "weekly", tfnProvided: false }).withholding, 470);
  assert.equal(calculateWithholding({ earnings: 1000.99, period: "weekly", tfnProvided: false, foreignResident: true }).withholding, 450);
  assert.equal(calculateWithholding({ earnings: 333, period: "weekly", tfnProvided: false }).withholding, 156); // 156.51 -> 156
});

test("selects tables by pay date and rejects unsupported dates and payees", () => {
  assert.throws(() => calculateWithholding({ earnings: 1000, period: "weekly", payDate: "2025-06-30" }), /outside the supported withholding tables/);
  assert.throws(() => calculateWithholding({ earnings: 1000, period: "weekly", payDate: "2027-07-01" }), /outside the supported withholding tables/);
  assert.equal(calculateWithholding({ earnings: 1000, period: "weekly", payDate: "2026-11-13" }).taxYear, "2026-27");
  assert.equal(calculateWithholding({ earnings: 1000, period: "weekly", payDate: "2026-06-30" }).taxYear, "2025-26");
  assert.throws(() => calculateWithholding({ earnings: 1000, period: "weekly", payDate: "2026-06-30", taxYear: "2026-27" }), /falls in 2025-26/);
  assert.throws(() => calculateWithholding({ earnings: 1000, period: "weekly", taxYear: "2024-25" }), /taxYear must be/);
  assert.throws(() => calculateWithholding({ earnings: 2000, period: "weekly", studyLoan: true, payDate: "2025-08-01" }), /earlier method/);
  assert.throws(() => calculateWithholding({ earnings: 1000, period: "weekly", workingHolidayMaker: true }), /Schedule 15/);
  assert.throws(() => calculateWithholding({ earnings: -1, period: "weekly" }), /non-negative/);
  assert.throws(() => calculateWithholding({ earnings: 1000, period: "daily" }), /period must be/);
});

// ---------- 2025-26 (Schedule 1 last updated 1 July 2024) ----------
const fixtures2025 = JSON.parse(readFileSync(new URL("./fixtures/ato-schedule1-2025-26-samples.json", import.meta.url)));

test("ATO sample data 2025-26: withholding amounts (scales 1,2,3,5,6)", () => {
  const rows = fixtures2025.cases.filter((c) => c.kind === "withholding");
  assert.equal(rows.length, 144);
  const failures = [];
  for (const row of rows) {
    for (const [key, extra] of Object.entries(scaleInput)) {
      const got = calculateWithholding({ earnings: row.earnings, period: row.period, taxYear: "2025-26", ...extra }).withholding;
      if (got !== row[key]) failures.push(`${row.period} ${row.earnings} ${key}: expected ${row[key]}, got ${got}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("ATO sample data 2025-26: Medicare levy adjustments (scales 2 and 6)", () => {
  const failures = [];
  const adj = (scale, earnings, period, family) => {
    const weekly = weeklyMedicareAdjustment(scale, weeklyEquivalentDollars(toCents(earnings), period), family, "2025-26");
    return period === "weekly" ? weekly : period === "fortnightly" ? weekly * 2 : Math.floor((2 * weekly * 13 + 3) / 6);
  };
  for (const row of fixtures2025.cases.filter((c) => c.kind !== "withholding")) {
    const scale = row.kind === "medicare_scale2" ? 2 : 6;
    if (scale === 2) {
      const got = adj(2, row.earnings, row.period, { spouse: true });
      if (got !== row.spouseOnly) failures.push(`s2 ${row.period} ${row.earnings} spouse: expected ${row.spouseOnly}, got ${got}`);
    }
    row.children.forEach((expected, i) => {
      const got = adj(scale, row.earnings, row.period, { spouse: true, children: i + 1 });
      if (got !== expected) failures.push(`s${scale} ${row.period} ${row.earnings} ${i + 1} children: expected ${expected}, got ${got}`);
    });
  }
  assert.deepEqual(failures, []);
  // Worked examples from the 2025 instrument
  assert.equal(weeklyMedicareAdjustment(2, 535, { spouse: true }, "2025-26"), 4);
  assert.equal(weeklyMedicareAdjustment(2, 1200, { spouse: true, children: 4 }, "2025-26"), 19);
});

test("2025-26 study loan component (marginal system from 24 September 2025) worked examples", () => {
  assert.equal(weeklyStudyLoanComponent(2608, true, "2025-26"), 202);
  assert.equal(calculateWithholding({ earnings: 4409.75, period: "fortnightly", studyLoan: true, taxYear: "2025-26" }).breakdown.studyLoanComponent, 274);
});

test("Schedule 5 Method A bonus withholding (ATO example: Jarrod, $900 bonus on $1,400 a week with HELP -> $364)", () => {
  const r = calculateBonusWithholding({ earnings: 1400, bonus: 900, period: "weekly", studyLoan: true });
  assert.equal(r.breakdown.tax, 260);
  assert.equal(r.breakdown.studyLoanComponent, 104);
  assert.equal(r.withholding, 364);
  // Capped at 47% of the bonus
  const small = calculateBonusWithholding({ earnings: 4000, bonus: 100, period: "weekly" });
  assert.ok(small.withholding <= 47);
  // No TFN: top rate on the bonus
  assert.equal(calculateBonusWithholding({ earnings: 1000, bonus: 1000, period: "weekly", tfnProvided: false }).withholding, 470);
});

test("overtime earnings", () => {
  assert.equal(overtimeEarnings({ hourlyRate: 40, hours: 5, multiplier: 1.5 }), 300);
  assert.equal(overtimeEarnings({ hourlyRate: 33.33, hours: 3, multiplier: 2 }), 199.98);
  assert.throws(() => overtimeEarnings({ hourlyRate: -1, hours: 1 }), /non-negative/);
});

test("Schedule 9 (seniors and pensioners) worked examples: $662 a week", () => {
  const w = (seniors, taxYear) => calculateWithholding({ earnings: 662.95, period: "weekly", seniors, taxYear }).withholding;
  assert.deepEqual([w("single", "2026-27"), w("illness-separated", "2026-27"), w("couple", "2026-27")], [2, 6, 21]);
  assert.deepEqual([w("single", "2025-26"), w("illness-separated", "2025-26"), w("couple", "2025-26")], [5, 11, 26]);
  assert.throws(() => calculateWithholding({ earnings: 700, period: "weekly", seniors: "single", foreignResident: true }), /residents/);
  assert.throws(() => calculateWithholding({ earnings: 700, period: "weekly", seniors: "widow" }), /seniors must be/);
});
