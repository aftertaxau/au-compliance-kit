import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateWithholding, weeklyStudyLoanComponent, estimateAnnualTax,
  incomeTaxCents, litoCents, medicareLevyCents, medicareLevySurchargeCents, studyLoanRepaymentCents,
  splitPackage, superGuaranteeCents, reducedMedicareLevyCents, saptoCents,
} from "../src/index.js";

test("Schedule 8 worked examples (study loan withholding component)", () => {
  // Example 1: weekly 2,608.36, threshold claimed -> 193
  assert.equal(weeklyStudyLoanComponent(2608, true), 193);
  // Example 2: fortnightly 4,409.75, threshold claimed -> weekly 130, fortnightly 260
  assert.equal(calculateWithholding({ earnings: 4409.75, period: "fortnightly", studyLoan: true }).breakdown.studyLoanComponent, 260);
  // Example 3: monthly 10,627.88, no threshold -> weekly 226, monthly 979
  assert.equal(calculateWithholding({ earnings: 10627.88, period: "monthly", taxFreeThreshold: false, studyLoan: true }).breakdown.studyLoanComponent, 979);
  // Below the weekly threshold nothing extra is withheld
  assert.equal(weeklyStudyLoanComponent(1336, true), 0);
  // No component when a Medicare levy family reduction is claimed
  assert.equal(calculateWithholding({ earnings: 2000, period: "weekly", studyLoan: true, medicareFamily: { spouse: true } }).breakdown.studyLoanComponent, 0);
});

test("resident income tax 2026-27 brackets", () => {
  assert.equal(incomeTaxCents(18200), 0);
  assert.equal(incomeTaxCents(45000), 402000); // (45,000 - 18,200) x 15%
  assert.equal(incomeTaxCents(59000), 822000); // matches published examples: $8,220
  assert.equal(incomeTaxCents(135000), 3102000);
  assert.equal(incomeTaxCents(190000), 5137000);
  assert.equal(incomeTaxCents(200000), 5587000);
  assert.equal(incomeTaxCents(85000.99), incomeTaxCents(85000)); // cents dropped
});

test("foreign resident income tax 2026-27", () => {
  assert.equal(incomeTaxCents(100000, { foreignResident: true }), 3000000);
  assert.equal(incomeTaxCents(135000, { foreignResident: true }), 4050000);
  assert.equal(incomeTaxCents(200000, { foreignResident: true }), 6535000);
});

test("low income tax offset (ATO examples)", () => {
  assert.equal(litoCents(30000), 70000);
  assert.equal(litoCents(45000), 32500); // ATO example: 700 - 375 = 325
  assert.equal(litoCents(59000), 11500); // 325 - 210
  assert.equal(litoCents(66667), 0);
  assert.equal(litoCents(80000), 0);
});

test("Medicare levy", () => {
  assert.equal(medicareLevyCents(28011), 0);
  assert.equal(medicareLevyCents(30000), 19890); // 10% of (30,000 - 28,011) = $198.90
  assert.equal(medicareLevyCents(59000), 118000);
  assert.equal(medicareLevyCents(85000, { foreignResident: true }), 0);
});

test("Medicare levy surcharge 2026-27 (ATO example: $117,000 at 1% = $1,170)", () => {
  assert.equal(medicareLevySurchargeCents(117000, { privateHospitalCover: false }), 117000);
  assert.equal(medicareLevySurchargeCents(105000, { privateHospitalCover: false }), 0);
  assert.equal(medicareLevySurchargeCents(130000, { privateHospitalCover: false }), 162500);
  assert.equal(medicareLevySurchargeCents(200000, { privateHospitalCover: false }), 300000);
  assert.equal(medicareLevySurchargeCents(200000, { privateHospitalCover: true }), 0);
});

test("study loan compulsory repayment 2026-27 (ATO example: $86,380 -> $2,527.80)", () => {
  assert.equal(studyLoanRepaymentCents(69528), 0);
  assert.equal(studyLoanRepaymentCents(86380), 252780);
  assert.equal(studyLoanRepaymentCents(150000), 902800 + 20283 * 17);
  assert.equal(studyLoanRepaymentCents(200000), 2000000);
});

test("salary packages that include super", () => {
  // $112,000 package = $100,000 salary + $12,000 super
  assert.deepEqual(splitPackage(112000), { salary: 100000, superGuarantee: 12000, salaryCents: 10000000, superCents: 1200000 });
  const p = splitPackage(85000);
  assert.equal(p.salary, 75892.86);
  assert.equal(p.superGuarantee, 9107.14);
  assert.equal(p.salaryCents + p.superCents, 8500000);
  assert.equal(superGuaranteeCents(75892.86), 910714);
  const inc = estimateAnnualTax({ salary: 112000, salaryIncludesSuper: true });
  const exc = estimateAnnualTax({ salary: 100000 });
  assert.equal(inc.salary, 100000);
  assert.equal(inc.superGuarantee, 12000);
  assert.deepEqual(inc.cents, exc.cents);
  assert.throws(() => splitPackage(-5), /non-negative/);
});

test("other income years: 2025-26 (16%) and 2027-28 (14%, estimate)", () => {
  assert.equal(incomeTaxCents(85000, { taxYear: "2025-26" }), 1628800);
  assert.equal(incomeTaxCents(45000, { taxYear: "2025-26" }), 428800);
  assert.equal(incomeTaxCents(85000, { taxYear: "2027-28" }), 1575200);
  assert.equal(incomeTaxCents(200000, { taxYear: "2027-28" }), 5560200);
  assert.equal(studyLoanRepaymentCents(86380, { taxYear: "2025-26" }), (86380 - 67000) * 15);
  assert.equal(medicareLevySurchargeCents(110000, { privateHospitalCover: false, taxYear: "2025-26" }), 110000);
  const last = estimateAnnualTax({ salary: 85000, taxYear: "2025-26" });
  assert.equal(last.cents.totalLiability, 1628800 + 170000);
  assert.ok(last.cents.withheld > 0);
  const next = estimateAnnualTax({ salary: 85000, taxYear: "2027-28" });
  assert.equal(next.estimate, true);
  assert.equal(next.cents.totalLiability, 1575200 + 170000);
  assert.equal(next.cents.withheld, null);
  assert.equal(next.cents.refund, null);
  assert.throws(() => estimateAnnualTax({ salary: 1, taxYear: "2024-25" }), /taxYear must be/);
});

test("overtime and bonus in the annual estimate", () => {
  const base = estimateAnnualTax({ salary: 80000 });
  const r = estimateAnnualTax({ salary: 80000, overtime: 5000, bonus: 3000 });
  assert.equal(r.taxableIncome, 88000);
  assert.equal(r.superGuarantee, 9960); // 12% of salary + bonus, not overtime
  assert.ok(r.cents.bonusWithheld > 0);
  assert.ok(r.cents.withheld > base.cents.withheld);
  assert.ok(Math.abs(r.cents.refund) < 50000, `refund should stay small, got ${r.cents.refund}`);
});

test("annual estimate: $85,000 salary paid fortnightly", () => {
  const r = estimateAnnualTax({ salary: 85000 });
  assert.equal(r.taxableIncome, 85000);
  assert.equal(r.cents.grossTax, 1602000);
  assert.equal(r.cents.lito, 0);
  assert.equal(r.cents.medicare, 170000);
  assert.equal(r.cents.totalLiability, 1772000);
  assert.equal(r.cents.withheld, 682 * 26 * 100);
  assert.equal(r.cents.refund, 1200);
});

test("annual estimate: deductions, other income, HELP and no hospital cover", () => {
  const r = estimateAnnualTax({ salary: 60000, deductions: 1000 });
  assert.equal(r.taxableIncome, 59000);
  assert.equal(r.cents.totalLiability, 822000 - 11500 + 118000); // 9,285
  const h = estimateAnnualTax({ salary: 90000, studyLoan: true, privateHospitalCover: false, otherIncome: 20000 });
  assert.equal(h.taxableIncome, 110000);
  assert.equal(h.cents.mls, 110000); // 1% tier
  assert.equal(h.cents.studyLoan, (110000 - 69528) * 15);
  assert.ok(h.cents.withheld > 0);
  assert.throws(() => estimateAnnualTax({ salary: -1 }), /non-negative/);
});

test("Medicare levy family reduction: ATO example (Ashton, $49,700 with spouse on $21,700 -> $92.90)", () => {
  // Ashton is entitled to SAPTO, so the ATO example uses the SAPTO thresholds: single $44,268 / $55,335,
  // family $61,623. His spouse's income is too low to pay the levy, so he gets the whole reduction.
  const levy = reducedMedicareLevyCents({
    taxableIncome: 49700,
    single: { rate: 2, lowerThreshold: 44268, upperThreshold: 55335, shadeInRate: 10 },
    family: { spouse: true, spouseIncome: 21700 },
    familyThreshold: 61623,
  });
  assert.equal(levy, 9290);
});

test("Medicare levy family reduction 2025-26 thresholds ($47,238 + $4,338 per child)", () => {
  // Couple, family income at or below the threshold: no levy
  assert.equal(medicareLevyCents(40000, { family: { spouse: true, spouseIncome: 7000 } }), 0);
  // Couple just above: 800 - (944.76 - 0.08 x 2,762) = 76.20 (spouse pays no levy, so the whole reduction)
  assert.equal(medicareLevyCents(40000, { family: { spouse: true, spouseIncome: 10000 } }), 7620);
  // Both pay: reduction shared by income. F = 50,000 + 40,000 = 90,000, T = 47,238 + 2 x 4,338 = 55,914
  // R = 1,118.28 - 0.08 x 34,086 < 0, so no reduction at this income
  assert.equal(medicareLevyCents(50000, { family: { spouse: true, spouseIncome: 40000, dependants: 2 } }), 100000);
  // Sole parent with two children on $55,000: T = 55,914, so no levy
  assert.equal(medicareLevyCents(55000, { family: { dependants: 2 } }), 0);
  // Sole parent with one child on $60,000: T = 51,576, F = 60,000, R = 1,031.52 - 673.92 = 357.60 -> 1,200 - 357.60
  assert.equal(medicareLevyCents(60000, { family: { dependants: 1 } }), 84240);
  // High family income: same as single
  assert.equal(medicareLevyCents(90000, { family: { spouse: true, spouseIncome: 90000, dependants: 3 } }), 180000);
});

test("Medicare levy surcharge family thresholds 2026-27", () => {
  const noCover = { privateHospitalCover: false };
  // Couple: combined $200,000 is under the $210,000 family threshold
  assert.equal(medicareLevySurchargeCents(120000, { ...noCover, family: { spouse: true, spouseIncome: 80000 } }), 0);
  // Combined $230,000: tier 1 (1%) on own income
  assert.equal(medicareLevySurchargeCents(120000, { ...noCover, family: { spouse: true, spouseIncome: 110000 } }), 120000);
  // Three children raise thresholds by $3,000: combined $212,000 -> base tier
  assert.equal(medicareLevySurchargeCents(112000, { ...noCover, family: { spouse: true, spouseIncome: 100000, dependants: 3 } }), 0);
  // 2025-26 family base threshold $202,000
  assert.equal(medicareLevySurchargeCents(110000, { ...noCover, taxYear: "2025-26", family: { spouse: true, spouseIncome: 95000 } }), 110000);
});

test("annual estimate with a family", () => {
  const single = estimateAnnualTax({ salary: 60000 });
  const parent = estimateAnnualTax({ salary: 60000, family: { dependants: 1 } });
  assert.equal(parent.cents.medicare, 84240);
  assert.equal(parent.cents.refund - single.cents.refund, single.cents.medicare - parent.cents.medicare);
  assert.throws(() => estimateAnnualTax({ salary: 1, family: { dependants: 1.5 } }), /whole number/);
});

test("SAPTO 2025-26: ATO examples", () => {
  const y = { taxYear: "2025-26" };
  assert.equal(saptoCents(39000, y), 172000); // José: 2,230 - 510.125 = 1,719.875, rounded up to 1,720
  assert.equal(saptoCents(32178, y), 223000); // Simon: under the shading-out threshold, maximum $2,230
  assert.equal(saptoCents(85690, y), 0); // Marko: over the cut-out threshold
  // Clare and Roy (couple): both get the maximum $1,602
  assert.equal(saptoCents(23020, { ...y, status: "couple", spouseRebateIncome: 25677 }), 160200);
  assert.equal(saptoCents(25677, { ...y, status: "couple", spouseRebateIncome: 23020 }), 160200);
  // Deb and Ivan: half of combined $89,697 is over $43,810, so neither gets SAPTO
  assert.equal(saptoCents(25677, { ...y, status: "couple", spouseRebateIncome: 64020 }), 0);
  // Ying and Li Jun: qualify on combined income; Li Jun gets the maximum, Ying's own income reduces hers to nil
  assert.equal(saptoCents(25677, { ...y, status: "couple", spouseRebateIncome: 54020 }), 160200);
  assert.equal(saptoCents(54020, { ...y, status: "couple", spouseRebateIncome: 25677 }), 0);
});

test("SAPTO 2026-27 thresholds and Medicare levy for SAPTO recipients", () => {
  assert.equal(saptoCents(36034), 223000);
  assert.equal(saptoCents(53873), 100); // just under the cut-out: 0.125 rounded up to $1
  assert.equal(saptoCents(53874), 0);
  assert.equal(saptoCents(44663, { status: "couple" }), 0);
  assert.equal(saptoCents(40000, { status: "illness-separated" }), Math.ceil((2040000 - (40000 - 34767) * 125) / 1000) * 100);
  // Ashton (ATO Medicare levy example) through the public API: SAPTO family thresholds give $92.90
  assert.equal(medicareLevyCents(49700, { taxYear: "2025-26", sapto: true, family: { spouse: true, spouseIncome: 21700 } }), 9290);
});

test("annual estimate for a senior with SAPTO", () => {
  // Single senior on $40,000: tax 3,270 less LITO 575 and SAPTO (2,230 less 0.125 x 3,966 = 1,734.25 -> 1,735) = 960
  const r = estimateAnnualTax({ salary: 40000, sapto: true });
  assert.equal(r.cents.lito, 57500);
  assert.equal(r.cents.sapto, 173500);
  assert.equal(r.cents.medicare, 0); // under the SAPTO Medicare threshold of $44,268
  assert.equal(r.cents.totalLiability, 96000);
  // At the shading-out threshold SAPTO and LITO wipe out the tax entirely (offsets capped at tax payable)
  const low = estimateAnnualTax({ salary: 36000, sapto: true });
  assert.equal(low.cents.totalLiability, 0);
  assert.equal(low.cents.sapto, low.cents.grossTax - low.cents.lito);
  assert.ok(r.cents.withheld >= 0);
  const couple = estimateAnnualTax({ salary: 30000, sapto: true, family: { spouse: true, spouseIncome: 20000 } });
  assert.ok(couple.cents.sapto > 0);
});
