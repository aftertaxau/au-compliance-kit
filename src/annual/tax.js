import { ANNUAL_YEARS, DEFAULT_INCOME_YEAR } from "./rates.js";
import { calculateWithholding, calculateBonusWithholding } from "../payg/withholding.js";
import { splitPackage, superGuaranteeCents } from "../super/super-guarantee.js";

// All amounts are computed in integer cents. Taxable income is whole dollars (cents are dropped),
// as on a tax return.

const roundHalfUp = (num, den) => Math.floor((2 * num + den) / (2 * den));
const wholeDollars = (amount) => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) throw new TypeError(`expected a number, got ${amount}`);
  return Math.max(0, Math.floor(amount));
};
const yearData = (taxYear = DEFAULT_INCOME_YEAR) => {
  const y = ANNUAL_YEARS[taxYear];
  if (!y) throw new RangeError(`taxYear must be one of ${Object.keys(ANNUAL_YEARS).join(", ")}, got ${taxYear}`);
  return y;
};

/** Income tax on taxable income before offsets, in cents. */
export function incomeTaxCents(taxableIncome, { foreignResident = false, taxYear } = {}) {
  const Y = yearData(taxYear);
  const ti = wholeDollars(taxableIncome);
  const brackets = foreignResident ? Y.foreignBrackets : Y.residentBrackets;
  let b = brackets[0];
  for (const br of brackets) if (ti > br.over) b = br;
  return b.base * 100 + (ti - b.over) * b.rate;
}

/** Low income tax offset in cents (residents only, before capping at tax payable). */
export function litoCents(taxableIncome, { taxYear } = {}) {
  const L = yearData(taxYear).lito;
  const ti = wholeDollars(taxableIncome);
  if (ti <= L.firstThreshold) return L.max * 100;
  if (ti <= L.secondThreshold) return L.max * 100 - (ti - L.firstThreshold) * 5;
  if (ti < L.cutOut) return Math.max(0, roundHalfUp(L.secondBase * 1000 - (ti - L.secondThreshold) * 15, 10));
  return 0;
}

const hasFamily = (family) => Boolean(family && (family.spouse || (family.dependants ?? 0) > 0));

/**
 * Medicare levy in cents with the low-income reductions, using explicit thresholds.
 * Single reduction: nil up to the lower threshold, then 10% of the excess, capped at 2% of income.
 * Family reduction (spouse or sole parent): nil if family income is at or below the family threshold;
 * otherwise the reduction amount is 2% of the threshold less 8% of family income above it, shared
 * between spouses by taxable income (all of it if the spouse's income is too low to pay the levy),
 * and taken off the levy worked out as a single person.
 */
export function reducedMedicareLevyCents({ taxableIncome, single, family, familyThreshold = 0, familyPerChild = 0 }) {
  const ti = wholeDollars(taxableIncome);
  let levy;
  if (ti <= single.lowerThreshold) levy = 0;
  else if (ti <= single.upperThreshold) levy = Math.min((ti - single.lowerThreshold) * single.shadeInRate, ti * single.rate);
  else levy = ti * single.rate;
  if (!hasFamily(family) || levy === 0) return levy;

  const spouseIncome = family.spouse ? wholeDollars(family.spouseIncome ?? 0) : 0;
  const familyIncome = ti + spouseIncome;
  const threshold = familyThreshold + familyPerChild * (family.dependants ?? 0);
  if (familyIncome <= threshold) return 0;
  const reduction = threshold * single.rate - (familyIncome - threshold) * 8; // cents: 0.02 x T - 0.08 x (F - T)
  if (reduction <= 0) return levy;
  const share = family.spouse && spouseIncome > single.lowerThreshold ? roundHalfUp(reduction * ti, familyIncome) : reduction;
  return Math.max(0, levy - share);
}

/**
 * Medicare levy in cents for a resident, with the single and family low-income reductions.
 * @param {number} taxableIncome
 * @param {{ foreignResident?: boolean, exemption?: "none"|"full"|"half", taxYear?: string,
 *   family?: { spouse?: boolean, spouseIncome?: number, dependants?: number } }} [opts]
 */
export function medicareLevyCents(taxableIncome, { foreignResident = false, exemption = "none", taxYear, family, sapto = false } = {}) {
  if (foreignResident || exemption === "full") return 0;
  const M = yearData(taxYear).medicare;
  // People entitled to SAPTO use higher single and family thresholds.
  const single = sapto ? { ...M, lowerThreshold: M.sapto.lowerThreshold, upperThreshold: M.sapto.upperThreshold } : M;
  const familyThreshold = sapto ? M.sapto.familyThreshold : M.familyThreshold;
  const levy = reducedMedicareLevyCents({ taxableIncome, single, family, familyThreshold, familyPerChild: M.familyPerChild });
  return exemption === "half" ? roundHalfUp(levy, 2) : levy;
}

/**
 * Medicare levy surcharge in cents for a resident without private hospital cover. Singles use the
 * single thresholds; couples and sole parents use the family thresholds on combined income (raised by
 * $1,500 per dependent child after the first). The rate applies to your own income.
 */
export function medicareLevySurchargeCents(incomeForMlsPurposes, { privateHospitalCover = true, foreignResident = false, taxYear, family } = {}) {
  if (privateHospitalCover || foreignResident) return 0;
  const Y = yearData(taxYear);
  const income = wholeDollars(incomeForMlsPurposes);
  let rate;
  if (hasFamily(family)) {
    const combined = income + (family.spouse ? wholeDollars(family.spouseIncome ?? 0) : 0);
    const extra = Y.mlsFamily.perChildAfterFirst * Math.max(0, (family.dependants ?? 0) - 1);
    const [base, tier1, tier2] = Y.mlsFamily.tiers.map((t) => t + extra);
    rate = combined <= base ? 0 : combined <= tier1 ? 100 : combined <= tier2 ? 125 : 150;
  } else {
    rate = Y.mlsSingles.find((t) => t.upTo === null || income <= t.upTo).ratePerTenThousand;
  }
  return roundHalfUp(income * rate, 100);
}

const SAPTO_STATUS = { single: "single", couple: "couple", "illness-separated": "illnessSeparated" };

/**
 * Seniors and pensioners tax offset in cents (before capping at tax payable).
 * Eligibility (age pension age or an eligible pension) is assumed; this applies the income tests.
 * Couples qualify if half their combined rebate income is under the cut-out threshold; the amount is
 * the maximum less 12.5c per $ of your own rebate income above the shading-out threshold, rounded up.
 * Rebate income is approximated by taxable income.
 * @param {number} rebateIncome
 * @param {{ status?: "single"|"couple"|"illness-separated", spouseRebateIncome?: number, taxYear?: string }} [opts]
 */
export function saptoCents(rebateIncome, { status = "single", spouseRebateIncome = 0, taxYear } = {}) {
  const key = SAPTO_STATUS[status];
  if (!key) throw new RangeError(`status must be single, couple or illness-separated, got ${status}`);
  const P = yearData(taxYear).sapto[key];
  const own = wholeDollars(rebateIncome);
  const testIncome = key === "single" ? own : (own + wholeDollars(spouseRebateIncome)) / 2;
  if (testIncome >= P.cutOut) return 0;
  const tenthsOfCents = P.max * 1000 - Math.max(0, own - P.shadeOut) * 125; // 12.5c per dollar over
  return tenthsOfCents <= 0 ? 0 : Math.ceil(tenthsOfCents / 1000) * 100;
}

/** Compulsory study and training loan repayment in cents (repayment income approximated by taxable income). */
export function studyLoanRepaymentCents(repaymentIncome, { taxYear } = {}) {
  const S = yearData(taxYear).studyLoan;
  const ri = wholeDollars(repaymentIncome);
  if (ri <= S.threshold) return 0;
  if (ri <= S.secondThreshold) return (ri - S.threshold) * 15;
  if (ri <= S.topThreshold) return S.secondBase * 100 + (ri - S.secondThreshold) * 17;
  return ri * S.topRate;
}

const PAYS_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12 };

/**
 * Estimate tax for a year and the refund (or bill) against tax withheld from a salary.
 *
 * @param {object} input
 * @param {number} input.salary annual salary or wages from one employer, excluding super, overtime and bonuses
 * @param {"2025-26"|"2026-27"|"2027-28"} [input.taxYear="2026-27"]
 * @param {"weekly"|"fortnightly"|"monthly"} [input.payFrequency="fortnightly"]
 * @param {number} [input.overtime=0] overtime earnings for the year (spread evenly across pays; no super guarantee)
 * @param {number} [input.bonus=0] bonus paid as a single payment during the year (withheld under Schedule 5 Method A)
 * @param {number} [input.otherIncome=0] other taxable income with no tax withheld (e.g. interest)
 * @param {number} [input.deductions=0] deductions claimed
 * @param {boolean} [input.foreignResident=false]
 * @param {boolean} [input.studyLoan=false] HELP or other study and training loan debt
 * @param {boolean} [input.privateHospitalCover=true]
 * @param {boolean} [input.taxFreeThreshold=true] claimed with this employer (affects withholding only)
 * @param {boolean} [input.salaryIncludesSuper=false] salary is a total package including the 12% super guarantee
 * @param {{ spouse?: boolean, spouseIncome?: number, dependants?: number }} [input.family] spouse and dependent
 *   children for the Medicare levy family reduction and the family surcharge thresholds
 * @param {boolean|"single"|"couple"|"illness-separated"} [input.sapto] eligible for the seniors and pensioners tax
 *   offset (true picks single or couple from family); also uses Schedule 9 for tax withheld
 */
export function estimateAnnualTax(input) {
  const {
    taxYear = DEFAULT_INCOME_YEAR, payFrequency = "fortnightly", overtime = 0, bonus = 0, otherIncome = 0, deductions = 0, otherDeductions = 0,
    foreignResident = false, studyLoan = false, privateHospitalCover = true, taxFreeThreshold = true, salaryIncludesSuper = false,
    family, sapto,
  } = input ?? {};
  if (family) {
    if (family.spouseIncome !== undefined && !(family.spouseIncome >= 0)) throw new RangeError("spouseIncome can't be negative");
    if (family.dependants !== undefined && !(Number.isInteger(family.dependants) && family.dependants >= 0)) throw new RangeError("dependants must be a whole number");
  }
  const Y = yearData(taxYear);
  if (!(input?.salary >= 0)) throw new RangeError("salary must be a non-negative number");
  if (!PAYS_PER_YEAR[payFrequency]) throw new RangeError("payFrequency must be weekly, fortnightly or monthly");
  for (const [k, v] of Object.entries({ overtime, bonus, otherIncome, deductions, otherDeductions })) {
    if (!(v >= 0)) throw new RangeError(`${k} can't be negative`);
  }
  const salary = salaryIncludesSuper ? splitPackage(input.salary).salary : input.salary;

  // Work-related expenses: from 2026-27 residents with labour income get the $1,000 standard deduction
  // (capped at their labour income) unless their itemised work-related expenses are higher.
  const labourIncome = salary + overtime + bonus;
  const standardDeductionEntitlement = foreignResident ? 0 : Math.min(Y.standardDeduction ?? 0, labourIncome);
  const workDeductions = Math.max(deductions, standardDeductionEntitlement);
  const standardDeductionUsed = workDeductions > deductions;
  const taxableIncome = Math.max(0, wholeDollars(salary + overtime + bonus + otherIncome - workDeductions - otherDeductions));
  const opts = { taxYear };
  const grossTax = incomeTaxCents(taxableIncome, { foreignResident, ...opts });
  const lito = foreignResident ? 0 : Math.min(litoCents(taxableIncome, opts), grossTax);
  const saptoStatus = foreignResident || !sapto ? undefined : sapto === true ? (family?.spouse ? "couple" : "single") : sapto;
  const saptoFull = saptoStatus ? saptoCents(taxableIncome, { status: saptoStatus, spouseRebateIncome: family?.spouseIncome ?? 0, ...opts }) : 0;
  const saptoOffset = Math.min(saptoFull, grossTax - lito);
  // Working Australians tax offset (2027-28 onwards): residents whose net labour income exceeds the
  // tax-free threshold get up to $250, limited to the income tax on that net labour income.
  let watoFull = 0;
  if (Y.wato && !foreignResident) {
    const netLabourIncome = Math.max(0, wholeDollars(labourIncome - workDeductions));
    if (netLabourIncome > Y.residentBrackets[1].over) watoFull = Math.min(Y.wato.max * 100, incomeTaxCents(netLabourIncome, opts));
  }
  const watoOffset = Math.min(watoFull, grossTax - lito - saptoOffset);
  const medicare = medicareLevyCents(taxableIncome, { foreignResident, family, sapto: saptoFull > 0, ...opts });
  const mls = medicareLevySurchargeCents(taxableIncome, { privateHospitalCover, foreignResident, family, ...opts });
  const loan = studyLoan ? studyLoanRepaymentCents(taxableIncome, opts) : 0;
  const totalLiability = grossTax - lito - saptoOffset - watoOffset + medicare + mls + loan;

  // Super guarantee on salary and bonus (ordinary time earnings), not on overtime.
  const superGuarantee = (superGuaranteeCents(salary) + superGuaranteeCents(bonus)) / 100;

  let withheld = null;
  let perPayWithholding = null;
  let bonusWithholding = 0;
  if (Y.withholdingYear) {
    const pays = PAYS_PER_YEAR[payFrequency];
    const perPay = Math.round(((salary + overtime) * 100) / pays) / 100;
    const common = { period: payFrequency, foreignResident, taxFreeThreshold, studyLoan, taxYear: Y.withholdingYear, seniors: saptoStatus };
    perPayWithholding = calculateWithholding({ earnings: perPay, ...common }).withholding;
    if (bonus > 0) bonusWithholding = calculateBonusWithholding({ earnings: perPay, bonus, ...common }).withholding;
    withheld = (perPayWithholding * pays + bonusWithholding) * 100;
  }

  return {
    incomeYear: taxYear,
    estimate: Boolean(Y.estimate),
    salary,
    superGuarantee,
    taxableIncome,
    workDeductions: wholeDollars(workDeductions),
    standardDeductionUsed,
    cents: {
      grossTax, lito, sapto: saptoOffset, wato: watoOffset, medicare, mls, studyLoan: loan, totalLiability,
      withheld, bonusWithheld: bonusWithholding * 100,
      refund: withheld === null ? null : withheld - totalLiability,
    },
    perPayWithholding,
    assumptions: [
      hasFamily(family)
        ? "Medicare levy family reduction and family surcharge thresholds applied; tax withheld assumes no Medicare levy variation declaration"
        : "Single, no dependants (no Medicare levy family reduction)",
      "Study loan repayment income and Medicare levy surcharge income approximated by taxable income",
      ...(standardDeductionUsed ? ["Includes the standard deduction for work-related expenses (higher itemised work expenses replace it)"] : []),
      ...(Y.standardDeduction && (deductions > 0 || otherDeductions > 0) ? ["deductions are treated as work-related expenses covered by the standard deduction; otherDeductions (gifts, tax agent fees) are added on top"] : []),
      ...Y.notes,
    ],
  };
}
