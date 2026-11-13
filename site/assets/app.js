import { calculateWithholding, calculateBonusWithholding, estimateAnnualTax, overtimeEarnings, splitPackage } from "./lib/index.js";
import { formatAsYouType } from "./inputs.js";
import { initMobileBar, updateMobileBar } from "./mobilebar.js";

const SUPER_RATE_PER_MILLE = 120; // 12% super guarantee
const PAYS = { weekly: 52, fortnightly: 26, monthly: 12 };
const PERIOD_WORD = { weekly: "a week", fortnightly: "a fortnight", monthly: "a month" };
const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const $ = (id) => document.getElementById(id);
const val = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
const fmtC = (cents) => money.format((cents || 0) / 100);

function parseAmount(raw, { required = true } = {}) {
  const cleaned = String(raw).replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === ".") return required ? { empty: true } : { value: 0 };
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return { error: "Enter a number, for example 1500 or 85000" };
  const value = Number(cleaned);
  if (value > 10_000_000) return { error: "That amount is too large for this calculator" };
  return { value };
}

function toPeriodPay(amount, basis, period) {
  if (basis === "year") return Math.round((amount * 100) / PAYS[period]) / 100;
  if (basis === "hour") {
    const hours = Number($("hours").value) || 38;
    const weekly = amount * hours;
    if (period === "weekly") return Math.round(weekly * 100) / 100;
    if (period === "fortnightly") return Math.round(weekly * 200) / 100;
    return Math.round((weekly * 52 * 100) / 12) / 100;
  }
  return amount;
}

/** Hourly rate implied by the inputs, for overtime. */
function impliedHourlyRate(amount, basis, period) {
  if (basis === "hour") return amount;
  const hours = 38;
  const weekly = basis === "year" ? amount / 52 : (amount * PAYS[period]) / 52;
  return Math.round((weekly / hours) * 100) / 100;
}

function render() {
  const parsed = parseAmount($("amount").value);
  const otHours = parseAmount($("ot-hours").value, { required: false });
  const otRateIn = parseAmount($("ot-rate").value, { required: false });
  const bonus = parseAmount($("bonus").value, { required: false });
  $("amount-error").textContent = parsed.error ?? "";
  $("extras-error").textContent = otHours.error || otRateIn.error || bonus.error || "";
  $("hours-field").hidden = val("basis") !== "hour";
  const out = $("result");
  const empty = $("result-empty");
  if (parsed.empty || parsed.error || otHours.error || otRateIn.error || bonus.error) { out.hidden = true; empty.hidden = false; updateMobileBar(null); return; }

  const year = val("year");
  const period = val("period");
  const basis = val("basis");
  const foreignResident = val("residency") === "foreign";
  const includesSuper = val("super") === "yes";
  const amount = includesSuper ? splitPackage(parsed.value).salary : parsed.value;
  const base = toPeriodPay(amount, basis, period);

  const autoRate = impliedHourlyRate(amount, basis, period);
  $("ot-rate").placeholder = autoRate.toFixed(2);
  const otRate = otRateIn.value || autoRate;
  const ot = otHours.value ? overtimeEarnings({ hourlyRate: otRate, hours: otHours.value, multiplier: Number(val("ot-mult")) }) : 0;
  const earnings = Math.round((base + ot) * 100) / 100;
  const n = PAYS[period];
  const mlChildren = Math.max(0, Math.floor(Number($("ml-children").value) || 0));
  const seniorsChoice = val("seniors") && val("seniors") !== "no" ? val("seniors") : undefined;
  const seniors = seniorsChoice && !foreignResident && val("tfn") === "yes" ? seniorsChoice : undefined;
  // Schedule 9 (seniors) has its own Medicare levy handling, so the family reduction panel is ignored with it.
  const medicareFamily = !seniors && (val("ml-spouse") === "yes" || mlChildren > 0) ? { spouse: val("ml-spouse") === "yes", children: mlChildren } : undefined;
  const common = { period, foreignResident, tfnProvided: val("tfn") === "yes", taxFreeThreshold: val("tft") === "yes", medicareFamily, seniors };

  let taxC, bonusTaxC = 0, scale = null, estimate = false, medicareAdjustment = 0;
  if (year === "2027-28") {
    // No 2027-28 withholding tables yet: spread the year's estimated tax evenly over the pays.
    estimate = true;
    const annual = (extraBonus) => estimateAnnualTax({ salary: earnings * n, bonus: extraBonus, taxYear: "2027-28", foreignResident, sapto: seniors }).cents.totalLiability;
    const noTfn = (dollars) => Math.floor((Math.floor(dollars) * (foreignResident ? 45 : 47)) / 100) * 100; // top rate, cents ignored
    taxC = common.tfnProvided ? Math.round(annual(0) / n) : noTfn(earnings);
    if (bonus.value) bonusTaxC = common.tfnProvided ? annual(bonus.value) - annual(0) : noTfn(bonus.value);
  } else {
    const r = calculateWithholding({ earnings, taxYear: year, ...common });
    taxC = r.withholding * 100;
    scale = r.scale;
    medicareAdjustment = r.breakdown.medicareAdjustment;
    if (bonus.value) bonusTaxC = calculateBonusWithholding({ earnings, bonus: bonus.value, taxYear: year, ...common }).withholding * 100;
  }
  const baseC = Math.round(base * 100);
  const otC = Math.round(ot * 100);
  const bonusC = Math.round(bonus.value * 100);
  const grossC = baseC + otC + bonusC;
  const totalTaxC = taxC + bonusTaxC;
  const netC = grossC - totalTaxC;
  const superC = Math.round(((baseC + bonusC) * SUPER_RATE_PER_MILLE) / 1000); // no super guarantee on overtime

  $("net").textContent = fmtC(netC);
  updateMobileBar(`Take-home ${PERIOD_WORD[period]}${estimate ? " (estimate)" : ""}`, fmtC(netC));
  $("net-label").textContent = `Take-home pay ${PERIOD_WORD[period]}${bonusC ? " (with bonus)" : ""}${estimate ? " · estimate" : ""}`;
  const netPct = grossC ? Math.round((netC / grossC) * 1000) / 10 : 0;
  const taxPct = Math.round((100 - netPct) * 10) / 10;
  $("split").innerHTML =
    `<div class="split" role="img" aria-label="Take-home pay is ${netPct}% of gross pay and tax is ${taxPct}%">` +
    `<span class="seg seg-net" style="width:${netPct}%"></span><span class="seg seg-tax" style="width:${taxPct}%"></span></div>` +
    `<ul class="legend"><li><i class="dot dot-net"></i>Take-home ${netPct}%</li><li><i class="dot dot-tax"></i>Tax ${taxPct}%</li><li><i class="dot dot-super"></i>Super ${fmtC(superC)}</li></ul>`;

  // Per-pay and per-year columns; a bonus is a one-off, so it isn't multiplied up.
  const yearBaseC = basis === "year" ? Math.round(amount * 100) : baseC * n;
  const rows = [[includesSuper ? "Pay (excluding super)" : "Regular pay", baseC, yearBaseC]];
  if (otC) rows.push(["Overtime", otC, otC * n]);
  if (bonusC) rows.push(["Bonus (one-off)", bonusC, bonusC]);
  rows.push([estimate ? "Estimated tax" : "Tax withheld", taxC, taxC * n]);
  if (bonusC) rows.push(["Tax on bonus", bonusTaxC, bonusTaxC]);
  const yearGross = yearBaseC + otC * n + bonusC;
  const yearTax = taxC * n + bonusTaxC;
  rows.push(["Take-home pay", netC, yearGross - yearTax, "total"]);
  rows.push(["Super (employer pays)", superC, Math.round(((yearBaseC + bonusC) * SUPER_RATE_PER_MILLE) / 1000)]);
  $("rows").innerHTML = rows.map(([label, c, y, cls]) =>
    `<tr${cls ? ` class="${cls}"` : ""}><td>${label}</td><td>${fmtC(c)}</td><td>${fmtC(y)}</td></tr>`).join("");

  const notes = [];
  if (estimate) notes.push("2027–28 is an estimate: the 14% rate is law, but the ATO hasn't published the 2027–28 withholding tables, so the year's tax is spread evenly across pays.");
  if (includesSuper) {
    const p = splitPackage(parsed.value);
    notes.push(`A ${money.format(parsed.value)} package including super is ${money.format(p.salary)} pay plus ${money.format(p.superGuarantee)} super.`);
  }
  if (otC) notes.push(`Overtime at ${val("ot-mult")}× ${money.format(otRate)} an hour. Super usually isn't paid on overtime.`);
  if (seniorsChoice && !seniors) notes.push("The seniors and pensioners tax offset only applies to Australian residents who've given their employer a TFN.");
  if (seniors && !estimate) notes.push("Uses the ATO's tax table for seniors and pensioners (Schedule 9), which builds in the seniors and pensioners tax offset.");
  if (seniors && (val("ml-spouse") === "yes" || mlChildren > 0)) notes.push("The Medicare levy family panel isn't used with the seniors table.");
  if (medicareFamily && !estimate) {
    if (scale !== 2 && scale !== 6) notes.push("The Medicare levy family reduction only applies when you claim the tax-free threshold as an Australian resident, so it doesn't change this result.");
    else if (medicareAdjustment > 0) notes.push(`Your Medicare levy variation declaration reduces the tax withheld by ${fmtC(medicareAdjustment * 100)} a pay.`);
    else notes.push("Your pay is above the limit for the Medicare levy family reduction, so it doesn't change the tax withheld. The reduction only applies to low family incomes, for example under about $59,000 a year for a couple with no children.");
  }
  if (bonusC && !estimate) notes.push("Tax on the bonus uses the ATO's method for bonuses (Schedule 5, Method A).");
  if (scale === 4) notes.push("No TFN: your employer must withhold at the top rate until you provide one.");
  if (scale === 1) notes.push("Without the tax-free threshold more tax is withheld. This is normal for a second job.");
  if (scale === 3) notes.push("Foreign residents can't claim the tax-free threshold and don't pay the Medicare levy.");
  $("calc-note").textContent = notes.join(" ");
  empty.hidden = true;
  out.hidden = false;
}

initMobileBar(document.querySelector("#calc .calc-result"));
formatAsYouType($("amount"));
formatAsYouType($("bonus"));
formatAsYouType($("ot-rate"), { commas: false });
formatAsYouType($("ot-hours"), { commas: false });
formatAsYouType($("hours"), { commas: false });
formatAsYouType($("ml-children"), { decimals: 0, commas: false });
$("calc").addEventListener("input", render);
$("calc").addEventListener("change", render);
document.addEventListener("yearchange", render);
render();
