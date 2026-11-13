import * as S1_2026 from "./schedule1-2026-27.js";
import * as S1_2024 from "./schedule1-2024.js";
import { STSL_BANDS as STSL_2026 } from "./schedule8-2026-27.js";
import { STSL_BANDS as STSL_2025, STSL_FROM as STSL_2025_FROM } from "./schedule8-2025-26.js";
import { SCHEDULE9 } from "./schedule9.js";

const SENIOR_STATUS = { single: "single", couple: "couple", "illness-separated": "illnessSeparated" };

/** @typedef {"weekly" | "fortnightly" | "monthly" | "quarterly"} PayPeriod */
/** @typedef {"2025-26" | "2026-27"} WithholdingYear */

const PERIODS = ["weekly", "fortnightly", "monthly", "quarterly"];
const PAYS_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12, quarterly: 4 };

/** Withholding tables by financial year (pay date between from and to, inclusive). */
export const WITHHOLDING_YEARS = {
  "2025-26": { from: "2025-07-01", to: "2026-06-30", s1: S1_2024, stsl: STSL_2025, stslFrom: STSL_2025_FROM },
  "2026-27": { from: "2026-07-01", to: "2027-06-30", s1: S1_2026, stsl: STSL_2026, stslFrom: "2026-07-01" },
};
export const DEFAULT_WITHHOLDING_YEAR = "2026-27";

/** Round a rational num/den to the nearest integer, halves going up (away from zero). */
function roundHalfUp(num, den) {
  if (num < 0) return -roundHalfUp(-num, den);
  return Math.floor((2 * num + den) / (2 * den));
}

/** Convert a dollar amount (number, up to 2dp) to integer cents. */
export function toCents(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    throw new TypeError(`earnings must be a non-negative finite number, got ${amount}`);
  }
  return Math.round(amount * 100);
}

function assertPeriod(period) {
  if (!PERIODS.includes(period)) throw new RangeError(`period must be one of ${PERIODS.join(", ")}, got ${period}`);
}

/** Pick the withholding year from an explicit taxYear and/or payDate. */
export function resolveWithholdingYear({ taxYear, payDate } = {}) {
  let year = taxYear;
  if (year !== undefined && !WITHHOLDING_YEARS[year]) {
    throw new RangeError(`taxYear must be one of ${Object.keys(WITHHOLDING_YEARS).join(", ")}, got ${taxYear}`);
  }
  if (payDate !== undefined) {
    const d = String(payDate).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new RangeError(`payDate must be YYYY-MM-DD, got ${payDate}`);
    const fromDate = Object.entries(WITHHOLDING_YEARS).find(([, y]) => d >= y.from && d <= y.to)?.[0];
    if (!fromDate) throw new RangeError(`payDate ${d} is outside the supported withholding tables (2025-26 and 2026-27); this version cannot calculate it`);
    if (year && year !== fromDate) throw new RangeError(`payDate ${d} falls in ${fromDate}, not ${year}`);
    year = fromDate;
  }
  return year ?? DEFAULT_WITHHOLDING_YEAR;
}

/**
 * Weekly-equivalent whole dollars for the period earnings (cents dropped), per Schedule 1.
 * @param {number} cents period earnings in cents
 * @param {PayPeriod} period
 */
export function weeklyEquivalentDollars(cents, period) {
  switch (period) {
    case "weekly": return Math.floor(cents / 100);
    case "fortnightly": return Math.floor(cents / 200);
    case "monthly": {
      const adj = cents % 100 === 33 ? cents + 1 : cents; // amounts ending in 33 cents get one cent added
      return Math.floor((adj * 3) / 1300);
    }
    case "quarterly": return Math.floor(cents / 1300);
  }
}

function formulaAmount(bands, dollars) {
  const band = bands.find((b) => b.lessThan === null || dollars < b.lessThan);
  if (band.a === 0 && band.b === 0) return 0;
  // y = a*x - b; a and b scaled by 1e4, x in cents  =>  y scaled by 1e6
  const yMicro = band.a * (dollars * 100 + 99) - band.b * 100;
  return yMicro <= 0 ? 0 : roundHalfUp(yMicro, 1_000_000);
}

/** Rounded weekly withholding (whole dollars) for weekly earnings x = dollars + 0.99, scales 1,2,3,5,6. */
export function weeklyScaleAmount(scale, dollars, taxYear = DEFAULT_WITHHOLDING_YEAR) {
  const bands = WITHHOLDING_YEARS[taxYear].s1.SCALES[scale];
  if (!bands) throw new RangeError(`scale must be 1, 2, 3, 5 or 6 for formula calculation, got ${scale}`);
  return formulaAmount(bands, dollars);
}

function scaleUpWeekly(weeklyAmount, period) {
  switch (period) {
    case "weekly": return weeklyAmount;
    case "fortnightly": return weeklyAmount * 2;
    case "monthly": return roundHalfUp(weeklyAmount * 13, 3);
    case "quarterly": return weeklyAmount * 13;
  }
}

/** Tax offset reduction for the period (whole dollars), from the annual offset amount claimed. */
export function taxOffsetForPeriod(annualOffset, period, taxYear = DEFAULT_WITHHOLDING_YEAR) {
  if (!annualOffset) return 0;
  return roundHalfUp(toCents(annualOffset) * WITHHOLDING_YEARS[taxYear].s1.TAX_OFFSET_PER_MILLE[period], 100_000);
}

/**
 * Weekly Medicare levy adjustment (whole dollars), scales 2 and 6.
 * @param {2|6} scale
 * @param {number} dollars weekly-equivalent earnings in whole dollars
 * @param {{ spouse?: boolean, children?: number }} family
 */
export function weeklyMedicareAdjustment(scale, dollars, family, taxYear = DEFAULT_WITHHOLDING_YEAR) {
  const M = WITHHOLDING_YEARS[taxYear].s1.MEDICARE;
  const p = M[scale];
  if (!p) return 0;
  const children = family?.children ?? 0;
  if (!family?.spouse && children <= 0) return 0;
  if (dollars < p.weeklyThreshold) return 0;
  const wftCents = children > 0
    ? roundHalfUp((M.familyThreshold + M.additionalChild * children) * 100, 52)
    : M.spouseOnlyWeeklyFamilyThresholdCents;
  const sopDollars = Math.floor((wftCents * 125) / 10_000); // WFT x 0.1 / 0.08 (scale 2) or x 0.05 / 0.04 (scale 6), cents ignored
  const xCents = dollars * 100 + 99;
  if (xCents >= sopDollars * 100) return 0;
  let tenThousandths; // adjustment expressed in 1/10,000 of a dollar
  if (scale === 2) {
    if (xCents < p.shadeInThreshold * 100) tenThousandths = (xCents - p.adjustmentFactorCents) * 10; // (x - factor) x 0.1
    else if (xCents < wftCents) tenThousandths = xCents * 2; // x x 0.02
    else tenThousandths = wftCents * 2 - (xCents - wftCents) * 8; // WFT x 0.02 - (x - WFT) x 0.08
  } else {
    if (xCents < p.shadeInThreshold * 100) tenThousandths = (xCents - p.adjustmentFactorCents) * 5; // (x - factor) x 0.05
    else if (xCents < wftCents) tenThousandths = xCents; // x x 0.01
    else tenThousandths = wftCents - (xCents - wftCents) * 4; // WFT x 0.01 - (x - WFT) x 0.04
  }
  if (tenThousandths <= 0) return 0;
  return roundHalfUp(tenThousandths, 10_000);
}

/** Weekly study and training support loan component (whole dollars), Schedule 8. */
export function weeklyStudyLoanComponent(dollars, thresholdClaimedOrForeign = true, taxYear = DEFAULT_WITHHOLDING_YEAR) {
  const bands = WITHHOLDING_YEARS[taxYear].stsl;
  return formulaAmount(thresholdClaimedOrForeign ? bands.thresholdClaimed : bands.noThreshold, dollars);
}

/**
 * Calculate PAYG withholding for one regular pay under Schedule 1 (and Schedule 8 for study loans).
 *
 * @param {object} input
 * @param {number} input.earnings gross earnings for the period in dollars, including allowances and overtime subject to withholding
 * @param {PayPeriod} input.period
 * @param {boolean} [input.tfnProvided=true] false applies scale 4 (no TFN)
 * @param {boolean} [input.foreignResident=false]
 * @param {boolean} [input.taxFreeThreshold=true] whether the payee claimed the tax-free threshold
 * @param {"none"|"full"|"half"} [input.medicareExemption="none"]
 * @param {number} [input.annualTaxOffset=0] total annual tax offsets claimed on the Withholding declaration
 * @param {{ spouse?: boolean, children?: number }} [input.medicareFamily] Medicare levy variation declaration (spouse / dependent children)
 * @param {string} [input.payDate] YYYY-MM-DD; selects the financial year's tables
 * @param {WithholdingYear} [input.taxYear] financial year's tables to use when no payDate is given (default 2026-27)
 * @param {boolean} [input.workingHolidayMaker=false] rejected: these payees need Schedule 15
 * @param {boolean} [input.studyLoan=false] HELP or other study and training support loan debt (adds the Schedule 8 component)
 * @param {"single"|"couple"|"illness-separated"} [input.seniors] payee claims the seniors and pensioners tax offset
 *   on their Withholding declaration: uses Schedule 9 for their status
 */
export function calculateWithholding(input) {
  const {
    earnings, period, tfnProvided = true, foreignResident = false, taxFreeThreshold = true,
    medicareExemption = "none", annualTaxOffset = 0, medicareFamily, payDate, taxYear, workingHolidayMaker = false,
    studyLoan = false, seniors,
  } = input ?? {};
  assertPeriod(period);
  if (seniors !== undefined && !SENIOR_STATUS[seniors]) throw new RangeError(`seniors must be single, couple or illness-separated, got ${seniors}`);
  const year = resolveWithholdingYear({ taxYear, payDate });
  const Y = WITHHOLDING_YEARS[year];
  if (workingHolidayMaker) throw new RangeError("working holiday makers use Schedule 15, which this version does not implement");
  if (studyLoan && payDate !== undefined && String(payDate).slice(0, 10) < Y.stslFrom) {
    throw new RangeError(`study loan withholding for pays before ${Y.stslFrom} used an earlier method this version does not implement`);
  }
  const cents = toCents(earnings);
  const source = Y.s1.SOURCE;

  if (!tfnProvided) {
    const rate = foreignResident ? Y.s1.SCALE4_RATE_PERCENT.foreignResident : Y.s1.SCALE4_RATE_PERCENT.resident;
    const withholding = Math.floor((Math.floor(cents / 100) * rate) / 100);
    return { withholding, scale: 4, taxYear: year, breakdown: { scaleAmount: withholding, taxOffset: 0, medicareAdjustment: 0, studyLoanComponent: 0 }, source };
  }

  if (seniors) {
    if (foreignResident) throw new RangeError("the seniors and pensioners tax offset (Schedule 9) is only for Australian residents");
    if (medicareExemption !== "none" || annualTaxOffset || medicareFamily) {
      throw new RangeError("Schedule 9 Medicare levy exemptions, adjustments and extra tax offsets aren't supported in this version");
    }
    const weeklyDollars = weeklyEquivalentDollars(cents, period);
    const scaleAmount = scaleUpWeekly(formulaAmount(SCHEDULE9[year][SENIOR_STATUS[seniors]], weeklyDollars), period);
    const studyLoanComponent = studyLoan ? scaleUpWeekly(weeklyStudyLoanComponent(weeklyDollars, true, year), period) : 0;
    return {
      withholding: scaleAmount + studyLoanComponent, scale: `seniors-${seniors}`, taxYear: year,
      breakdown: { scaleAmount, taxOffset: 0, medicareAdjustment: 0, studyLoanComponent },
      source: `ATO Schedule 9 – Tax table for seniors and pensioners (${year})`,
    };
  }

  let scale;
  if (foreignResident) scale = 3;
  else if (!taxFreeThreshold) scale = 1;
  else if (medicareExemption === "full") scale = 5;
  else if (medicareExemption === "half") scale = 6;
  else scale = 2;

  const weeklyDollars = weeklyEquivalentDollars(cents, period);
  const scaleAmount = scaleUpWeekly(weeklyScaleAmount(scale, weeklyDollars, year), period);
  const taxOffset = [2, 5, 6].includes(scale) ? taxOffsetForPeriod(annualTaxOffset, period, year) : 0;
  const medicareAdjustment = [2, 6].includes(scale)
    ? scaleUpWeekly(weeklyMedicareAdjustment(scale, weeklyDollars, medicareFamily, year), period)
    : 0;
  // Schedule 8: not applied when the payee claimed a Medicare levy reduction for a spouse or dependants.
  const familyReduction = Boolean(medicareFamily?.spouse || (medicareFamily?.children ?? 0) > 0);
  const studyLoanComponent = studyLoan && !familyReduction
    ? scaleUpWeekly(weeklyStudyLoanComponent(weeklyDollars, taxFreeThreshold || foreignResident, year), period)
    : 0;
  const withholding = Math.max(0, scaleAmount - taxOffset - medicareAdjustment) + studyLoanComponent;
  return { withholding, scale, taxYear: year, breakdown: { scaleAmount, taxOffset, medicareAdjustment, studyLoanComponent }, source };
}

/**
 * Withholding on a bonus, commission or similar payment made with a regular pay, using
 * Schedule 5 Method A: spread the payment over the pay periods in a year, find the extra
 * withholding per pay on the regular earnings, multiply back up, and cap at 47% of the payment.
 *
 * @param {object} input same options as calculateWithholding, plus:
 * @param {number} input.earnings regular gross earnings for the pay period (excluding the bonus)
 * @param {number} input.bonus the bonus or similar payment made in this pay
 * @param {number} [input.periodsCovered] optional: pay periods the payment relates to (if under 12 months)
 */
export function calculateBonusWithholding(input) {
  const { bonus, periodsCovered, earnings, period, tfnProvided = true, foreignResident = false } = input ?? {};
  assertPeriod(period);
  const bonusCents = toCents(bonus);
  if (!tfnProvided) {
    // No TFN: withhold the top rate on the whole payment (ignoring cents), no study loan component.
    const rate = foreignResident ? 45 : 47;
    const withholding = Math.floor((Math.floor(bonusCents / 100) * rate) / 100);
    return { withholding, breakdown: { tax: withholding, studyLoanComponent: 0, cap: withholding } };
  }
  const periods = periodsCovered ?? PAYS_PER_YEAR[period];
  const regularDollars = Math.floor(toCents(earnings) / 100); // step 1: ignore cents
  const spreadDollars = Math.floor(bonusCents / 100 / periods); // step 3: ignore cents
  const base = calculateWithholding({ ...input, earnings: regularDollars });
  const withSpread = calculateWithholding({ ...input, earnings: regularDollars + spreadDollars });
  const tax = Math.max(0, withSpread.withholding - withSpread.breakdown.studyLoanComponent - (base.withholding - base.breakdown.studyLoanComponent)) * periods;
  const studyLoanComponent = Math.max(0, withSpread.breakdown.studyLoanComponent - base.breakdown.studyLoanComponent) * periods;
  const cap = Math.floor((bonusCents * 47) / 10000); // step 8: 47% of the payment
  const withholding = Math.min(tax + studyLoanComponent, cap); // step 9, cents ignored
  return { withholding, breakdown: { tax, studyLoanComponent, cap }, taxYear: base.taxYear };
}

/** Optional extra withholding a payee may request in a year with 53 weekly or 27 fortnightly pays. */
export function extraPayWithholding(earnings, period, taxYear = DEFAULT_WITHHOLDING_YEAR) {
  const table = WITHHOLDING_YEARS[taxYear].s1.EXTRA_PAY_WITHHOLDING[period];
  if (!table) return 0;
  const dollars = Math.floor(toCents(earnings) / 100);
  const row = table.find((r) => dollars >= r.from && (r.to === null || dollars <= r.to));
  return row ? row.amount : 0;
}
