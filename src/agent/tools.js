// Tools for AI agents: one set of definitions shared by the MCP server (stdio and remote) and the
// web API. Each tool has a JSON Schema for its input and returns plain JSON with amounts in dollars.
import {
  calculateWithholding,
  calculateBonusWithholding,
  DEFAULT_WITHHOLDING_YEAR,
  WITHHOLDING_YEARS,
} from "../payg/withholding.js";
import { estimateAnnualTax } from "../annual/tax.js";
import { ANNUAL_YEARS, DEFAULT_INCOME_YEAR } from "../annual/rates.js";
import { SUPER_GUARANTEE_PERCENT, splitPackage } from "../super/super-guarantee.js";
import {
  validateAbn,
  validateAcn,
  validateTfn,
  validateBsbFormat,
  validateAccountNumberFormat,
} from "../validators/index.js";

/** Thrown for input an agent can fix; the message says what to change. */
export class ToolInputError extends Error {}

const WITHHOLDING_YEAR_IDS = Object.keys(WITHHOLDING_YEARS);
const INCOME_YEAR_IDS = Object.keys(ANNUAL_YEARS);
const SOURCE = "ATO PAYG withholding formulas (Schedule 1, NAT 1004), checked against every row of the ATO's published sample data; annual rates from the ATO's published tax rates and thresholds.";
const DISCLAIMER = "General information, not tax advice. Not affiliated with the Australian Taxation Office.";
const dollars = (cents) => (cents === null || cents === undefined ? null : Math.round(cents) / 100);

// ---------- shared schema pieces ----------
const withholdingYear = {
  type: "string",
  enum: WITHHOLDING_YEAR_IDS,
  description: `Australian financial year (1 July to 30 June) whose withholding tables to use. Default ${DEFAULT_WITHHOLDING_YEAR}.`,
};
const period = { type: "string", enum: ["weekly", "fortnightly", "monthly", "quarterly"], description: "Pay period." };
const common = {
  taxFreeThreshold: { type: "boolean", description: "Tax-free threshold claimed with this employer. Default true (main job). Use false for a second job." },
  tfnProvided: { type: "boolean", description: "Employee gave their tax file number. Default true. False applies the no-TFN rate." },
  foreignResident: { type: "boolean", description: "Foreign resident for tax purposes. Default false." },
  studyLoan: { type: "boolean", description: "Has a HELP, VSL, SSL or other study and training support loan. Default false." },
};

// ---------- tool implementations ----------
const PERIODS = [["weekly", 52], ["fortnightly", 26], ["monthly", 12]];

function takeHomePay(a) {
  if ((a.salary === undefined) === (a.hourlyRate === undefined)) {
    throw new ToolInputError("Give exactly one of salary (per year) or hourlyRate.");
  }
  const taxYear = a.taxYear ?? DEFAULT_WITHHOLDING_YEAR;
  const hours = a.hoursPerWeek ?? 38;
  let salaryCents, periodCents, basis, packageSplit = null;
  if (a.salary !== undefined) {
    let salary = a.salary;
    if (a.salaryIncludesSuper) {
      packageSplit = splitPackage(salary);
      salary = packageSplit.salary;
    }
    salaryCents = Math.round(salary * 100);
    periodCents = Object.fromEntries(PERIODS.map(([p, n]) => [p, Math.round(salaryCents / n)]));
    basis = a.salaryIncludesSuper ? "Package including super, split into salary and 12% super" : "Annual salary, excluding super";
  } else {
    if (a.salaryIncludesSuper) throw new ToolInputError("salaryIncludesSuper only applies to salary, not hourlyRate.");
    const weekly = Math.round(a.hourlyRate * hours * 100);
    periodCents = { weekly, fortnightly: weekly * 2, monthly: Math.round((weekly * 52) / 12) };
    salaryCents = weekly * 52;
    basis = `Hourly rate × ${hours} hours a week, 52 weeks a year`;
  }
  const opts = {
    taxYear,
    taxFreeThreshold: a.taxFreeThreshold ?? true,
    tfnProvided: a.tfnProvided ?? true,
    foreignResident: a.foreignResident ?? false,
    studyLoan: a.studyLoan ?? false,
  };
  const pays = {};
  let scale;
  for (const [p] of PERIODS) {
    const r = calculateWithholding({ earnings: periodCents[p] / 100, period: p, ...opts });
    scale = r.scale;
    const tax = r.withholding * 100;
    pays[p] = {
      grossPay: dollars(periodCents[p]),
      taxWithheld: r.withholding,
      takeHomePay: dollars(periodCents[p] - tax),
      superGuarantee: dollars(Math.round((periodCents[p] * SUPER_GUARANTEE_PERCENT) / 100)),
    };
  }
  const yearTax = pays.fortnightly.taxWithheld * 100 * 26;
  const result = {
    taxYear,
    basis,
    annualSalary: dollars(salaryCents),
    ...(packageSplit ? { package: a.salary, superIncludedInPackage: packageSplit.superGuarantee } : {}),
    perPay: pays,
    year: {
      grossPay: dollars(salaryCents),
      taxWithheld: dollars(yearTax),
      takeHomePay: dollars(salaryCents - yearTax),
      superGuarantee: dollars(Math.round((salaryCents * SUPER_GUARANTEE_PERCENT) / 100)),
      basis: "26 fortnightly pays",
    },
    withholdingScale: scale,
  };
  if (opts.tfnProvided) {
    const est = estimateAnnualTax({
      salary: salaryCents / 100,
      taxYear,
      payFrequency: "fortnightly",
      taxFreeThreshold: opts.taxFreeThreshold,
      foreignResident: opts.foreignResident,
      studyLoan: opts.studyLoan,
    });
    result.taxForTheYear = annualSummary(est);
  }
  result.notes = [
    "Tax withheld is what the employer takes out of each pay. The tax actually owed for the year is worked out on the tax return, so a refund or bill is normal.",
    `Employers pay the ${SUPER_GUARANTEE_PERCENT}% super guarantee on top of the salary, into the employee's super fund.`,
  ];
  result.source = SOURCE;
  result.disclaimer = DISCLAIMER;
  return result;
}

function annualSummary(est) {
  const c = est.cents;
  return {
    workDeductions: est.workDeductions,
    standardDeductionUsed: est.standardDeductionUsed,
    taxableIncome: est.taxableIncome,
    incomeTax: dollars(c.grossTax),
    lowIncomeTaxOffset: dollars(c.lito),
    seniorsAndPensionersTaxOffset: dollars(c.sapto),
    workingAustraliansTaxOffset: dollars(c.wato),
    medicareLevy: dollars(c.medicare),
    medicareLevySurcharge: dollars(c.mls),
    studyLoanRepayment: dollars(c.studyLoan),
    totalTax: dollars(c.totalLiability),
    taxWithheld: dollars(c.withheld),
    estimatedRefund: dollars(c.refund),
  };
}

function paygWithholding(a) {
  const r = calculateWithholding(a);
  return {
    earnings: a.earnings,
    period: a.period,
    withholding: r.withholding,
    takeHomePay: dollars(Math.round(a.earnings * 100) - r.withholding * 100),
    taxYear: r.taxYear,
    scale: r.scale,
    breakdown: r.breakdown,
    source: r.source,
    disclaimer: DISCLAIMER,
  };
}

function bonusWithholding(a) {
  const r = calculateBonusWithholding(a);
  return {
    earnings: a.earnings,
    bonus: a.bonus,
    period: a.period,
    withholdingOnBonus: r.withholding,
    taxYear: r.taxYear ?? a.taxYear ?? DEFAULT_WITHHOLDING_YEAR,
    breakdown: r.breakdown,
    method: "Schedule 5 Method A: the extra tax from adding the bonus, spread across the year's pay periods, to normal earnings, multiplied back up (never more than 47% of the bonus).",
    note: "This is withholding on the bonus only. Withhold on the regular earnings separately (payg_withholding).",
    disclaimer: DISCLAIMER,
  };
}

function annualTax(a) {
  const est = estimateAnnualTax(a);
  return {
    incomeYear: est.incomeYear,
    estimate: est.estimate,
    salary: est.salary,
    superGuarantee: est.superGuarantee,
    taxableIncome: est.taxableIncome,
    ...annualSummary(est),
    taxWithheldPerPay: est.perPayWithholding,
    bonusTaxWithheld: dollars(est.cents.bonusWithheld),
    refundMeaning: "estimatedRefund is positive for a refund and negative for a tax bill. Null when no withholding tables exist for the year.",
    assumptions: est.assumptions,
    source: SOURCE,
    disclaimer: DISCLAIMER,
  };
}

function superGuarantee(a) {
  if (a.includesSuper) {
    const p = splitPackage(a.amount);
    return { package: a.amount, salary: p.salary, superGuarantee: p.superGuarantee, ratePercent: SUPER_GUARANTEE_PERCENT, method: "salary = package ÷ 1.12" };
  }
  const cents = Math.round(a.amount * 100);
  const superCents = Math.round((cents * SUPER_GUARANTEE_PERCENT) / 100);
  return {
    earnings: a.amount,
    superGuarantee: dollars(superCents),
    ratePercent: SUPER_GUARANTEE_PERCENT,
    note: "Paid by the employer on top of ordinary time earnings (not overtime). From 1 July 2026 (Payday Super) it must reach the fund within 7 days of each payday. The maximum super contribution base is not applied.",
  };
}

const VALIDATORS = { abn: validateAbn, acn: validateAcn, tfn: validateTfn, bsb: validateBsbFormat, bank_account: validateAccountNumberFormat };
function validateIdentifier(a) {
  const r = VALIDATORS[a.type](a.value);
  const checks = {
    abn: "ABR check-digit algorithm (mod 89). Checks the number is well formed, not that it is registered: use the ABR's ABN Lookup for that.",
    acn: "ASIC check-digit algorithm.",
    tfn: "ATO check-digit algorithm (mod 11). Don't store or log TFNs unless you're allowed to collect them.",
    bsb: "Format only (6 digits). Doesn't check the BSB exists.",
    bank_account: "Format only. Doesn't check the account exists.",
  };
  return { type: a.type, ...r, check: checks[a.type] };
}

function taxRates(a) {
  const id = a.taxYear ?? DEFAULT_INCOME_YEAR;
  const y = ANNUAL_YEARS[id];
  const brackets = (list) => list.map((b, i) => ({
    from: b.over === 0 ? 0 : b.over + 1,
    to: list[i + 1] ? list[i + 1].over : null,
    ratePercent: b.rate,
    taxOnIncomeBelow: b.base,
  }));
  const w = y.withholdingYear ? WITHHOLDING_YEARS[y.withholdingYear] : null;
  return {
    incomeYear: id,
    estimate: Boolean(y.estimate),
    residentTaxRates: brackets(y.residentBrackets),
    foreignResidentTaxRates: brackets(y.foreignBrackets),
    howToUse: "Tax = taxOnIncomeBelow + ratePercent% of the income above (from − 1). Then subtract offsets and add the Medicare levy.",
    lowIncomeTaxOffset: { maximum: y.lito.max, reducesAbove: y.lito.firstThreshold, rate1: "5c per $1 between 37,500 and 45,000", rate2: "1.5c per $1 above 45,000", nilFrom: y.lito.cutOut },
    medicareLevy: {
      ratePercent: y.medicare.rate,
      singleLowIncome: { nilUpTo: y.medicare.lowerThreshold, fullFrom: y.medicare.upperThreshold, shadeInRatePercent: y.medicare.shadeInRate },
      familyLowIncome: { threshold: y.medicare.familyThreshold, extraPerDependentChild: y.medicare.familyPerChild },
      seniorsAndPensioners: y.medicare.sapto,
    },
    medicareLevySurcharge: {
      singles: y.mlsSingles.map((t) => ({ incomeUpTo: t.upTo, ratePercent: t.ratePerTenThousand / 100 })),
      families: { tierThresholds: y.mlsFamily.tiers, extraPerChildAfterFirst: y.mlsFamily.perChildAfterFirst },
      appliesTo: "People without an appropriate level of private patient hospital cover.",
    },
    studyLoanRepayment: {
      ...y.studyLoan,
      method: "Marginal: nothing up to threshold; 15c per $1 between threshold and secondThreshold; secondBase plus 17c per $1 above secondThreshold; topRate% of the whole repayment income from topThreshold.",
    },
    seniorsAndPensionersTaxOffset: y.sapto,
    standardDeductionForWorkExpenses: y.standardDeduction ? { amount: y.standardDeduction, rule: "Residents with work income get the lesser of this and their work income, unless itemised work-related expenses are higher" } : null,
    workingAustraliansTaxOffset: y.wato ? { maximum: y.wato.max, rule: "Residents whose net labour income exceeds the tax-free threshold; limited to the income tax on net labour income. Non-refundable" } : null,
    superGuaranteePercent: SUPER_GUARANTEE_PERCENT,
    withholdingTables: w ? { from: w.from, to: w.to } : null,
    notes: y.notes,
    source: SOURCE,
  };
}

function gstCalculation(a) {
  const cents = Math.round(a.amount * 100);
  const gst = a.includesGst ? Math.round(cents / 11) : Math.round(cents / 10);
  const ex = a.includesGst ? cents - gst : cents;
  return {
    priceExcludingGst: dollars(ex),
    gst: dollars(gst),
    priceIncludingGst: dollars(ex + gst),
    ratePercent: 10,
    method: a.includesGst ? "GST included = price including GST divided by 11" : "GST = 10% of the price excluding GST",
  };
}

const PER_DIVISOR = { weekly: 52, fortnightly: 26, monthly: 12 };
function salaryForTakeHome(a) {
  const opts = { taxYear: a.taxYear, taxFreeThreshold: a.taxFreeThreshold, studyLoan: a.studyLoan, foreignResident: a.foreignResident };
  const net = (salary) => {
    const r = takeHomePay({ salary, ...opts });
    return a.per === "year" ? r.year.takeHomePay : r.perPay[a.per].takeHomePay;
  };
  const target = a.takeHome;
  let lo = 0, hi = 5_000_000;
  if (net(hi) < target) throw new ToolInputError("That take-home is beyond what this calculator covers (salaries up to $5,000,000).");
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (net(mid) >= target) hi = mid; else lo = mid;
  }
  // Withholding is rounded to whole dollars, so step down past any small rounding bumps.
  let salary = hi;
  for (let i = 0; i < 200 && salary > 0 && net(salary - 1) >= target; i++) salary--;
  const result = takeHomePay({ salary, ...opts });
  return {
    targetTakeHome: target,
    per: a.per,
    salaryNeeded: salary,
    achievedTakeHome: a.per === "year" ? result.year.takeHomePay : result.perPay[a.per].takeHomePay,
    perPay: result.perPay,
    year: result.year,
    superGuaranteeOnTop: result.year.superGuarantee,
    taxYear: result.taxYear,
    note: "salaryNeeded is the lowest whole-dollar annual salary (excluding super) whose take-home reaches the target, using the ATO's withholding formulas. Tax withheld is rounded to whole dollars, so the achieved take-home can be slightly above the target.",
    source: SOURCE,
    disclaimer: DISCLAIMER,
  };
}

// ---------- definitions ----------
export const TOOLS = [
  {
    name: "take_home_pay",
    title: "Australian take-home pay",
    description: "Take-home pay in Australia for a salary or hourly rate, for 2025-26 or 2026-27. Returns gross pay, PAYG tax withheld, net pay and the employer's 12% super for each week, fortnight and month and for the year, plus a basic estimate of the year's tax and refund that assumes no other income and uses the $1,000 standard deduction for work expenses (from 2026-27). Use it for questions like 'how much do I take home on $85,000'. For one specific pay with declaration details use payg_withholding; for a tax return estimate with deductions, other income, family or seniors offsets use annual_tax_estimate; to go from a target take-home to a salary use salary_for_take_home. Amounts in AUD. Read-only and deterministic; no network calls.",
    inputSchema: {
      type: "object",
      properties: {
        salary: { type: "number", minimum: 0, description: "Annual salary in AUD, excluding super unless salaryIncludesSuper is true, e.g. 85000. Give salary or hourlyRate, not both." },
        hourlyRate: { type: "number", minimum: 0, description: "Hourly rate in AUD excluding super, including any casual loading, e.g. 35.5." },
        hoursPerWeek: { type: "number", minimum: 0, maximum: 168, description: "Hours a week for hourlyRate. Default 38 (full time)." },
        salaryIncludesSuper: { type: "boolean", description: "The salary is a total package that includes the 12% super guarantee. Default false." },
        taxYear: withholdingYear,
        ...common,
      },
      additionalProperties: false,
    },
    run: takeHomePay,
    page: (a, site) => {
      const plain = !a.salaryIncludesSuper && a.taxFreeThreshold !== false && !a.foreignResident && !a.studyLoan && a.tfnProvided !== false && (a.taxYear ?? DEFAULT_WITHHOLDING_YEAR) === "2026-27";
      const s = a.salary;
      if (plain && s !== undefined && ((Number.isInteger(s / 1000) && s >= 20000 && s <= 250000) || (Number.isInteger(s / 10000) && s > 250000 && s <= 500000))) return `${site}/salary/${s}/`;
      if (plain && a.hourlyRate !== undefined && (a.hoursPerWeek ?? 38) === 38 && Number.isInteger(a.hourlyRate) && a.hourlyRate >= 20 && a.hourlyRate <= 100) return `${site}/hourly/${a.hourlyRate}/`;
      return `${site}/`;
    },
  },
  {
    name: "payg_withholding",
    title: "PAYG withholding for one pay",
    description: "Exact PAYG tax an Australian employer must withhold from one pay (weekly, fortnightly, monthly or quarterly) under ATO Schedule 1 (NAT 1004), with Schedule 8 for study loans and Schedule 9 for seniors, for 2025-26 or 2026-27. Use it in payroll code or when declaration details matter: tax-free threshold, TFN, residency, HELP, Medicare levy exemption or family variation, tax offsets. Returns whole dollars to withhold, take-home for the pay, the tax scale and a breakdown. For a whole-salary summary use take_home_pay; for a bonus or commission use bonus_withholding. Working holiday makers aren't supported and return an error. Read-only and deterministic.",
    inputSchema: {
      type: "object",
      properties: {
        earnings: { type: "number", minimum: 0, description: "Gross earnings for this pay period in AUD, including taxable allowances and overtime, e.g. 3076.92 for a fortnight." },
        period,
        payDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Pay date (YYYY-MM-DD). Picks the financial year's tables; overrides taxYear." },
        taxYear: withholdingYear,
        ...common,
        medicareExemption: { type: "string", enum: ["none", "half", "full"], description: "Medicare levy exemption claimed. Default none." },
        annualTaxOffset: { type: "number", minimum: 0, description: "Total annual tax offsets claimed on the withholding declaration (AUD)." },
        medicareFamily: {
          type: "object",
          description: "Medicare levy variation declaration (lower withholding for low-income families).",
          properties: { spouse: { type: "boolean" }, children: { type: "integer", minimum: 0 } },
          additionalProperties: false,
        },
        seniors: { type: "string", enum: ["single", "couple", "illness-separated"], description: "Claims the seniors and pensioners tax offset with this status (uses Schedule 9)." },
      },
      required: ["earnings", "period"],
      additionalProperties: false,
    },
    run: paygWithholding,
  },
  {
    name: "bonus_withholding",
    title: "Tax withheld from a bonus",
    description: "PAYG tax to withhold from a bonus, commission or other one-off payment made with a regular Australian pay, using ATO Schedule 5 Method A, for 2025-26 or 2026-27. Use it for 'how much tax comes out of my bonus'. Returns the tax on the bonus only, never more than 47% of it; work out the regular pay's withholding separately with payg_withholding. Amounts in AUD. Read-only and deterministic.",
    inputSchema: {
      type: "object",
      properties: {
        earnings: { type: "number", minimum: 0, description: "Regular gross earnings for the pay period the bonus is paid with (AUD), excluding the bonus." },
        bonus: { type: "number", minimum: 0, description: "The bonus or commission amount (AUD)." },
        period,
        periodsCovered: { type: "integer", minimum: 1, description: "Pay periods the bonus relates to, if less than a year." },
        payDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Pay date (YYYY-MM-DD)." },
        taxYear: withholdingYear,
        ...common,
      },
      required: ["earnings", "bonus", "period"],
      additionalProperties: false,
    },
    run: bonusWithholding,
  },
  {
    name: "annual_tax_estimate",
    title: "Australian income tax and refund estimate",
    description: "Australian income tax for a whole financial year and the likely refund or bill: tax at resident or foreign rates, low income tax offset, seniors and pensioners tax offset, Medicare levy with low-income and family reductions, Medicare levy surcharge and compulsory HELP/study loan repayments, compared with the tax withheld. Applies the $1,000 standard deduction for work-related expenses from 2026-27 and the working Australians tax offset (up to $250) from 2027-28. Use it for tax return estimates and questions involving deductions, other income, overtime, bonuses, couples and families, seniors or private health cover. For per-pay take-home figures use take_home_pay. Supports 2025-26, 2026-27 and 2027-28 (an estimate with no refund). estimatedRefund is positive for a refund and negative for a bill. AUD. Read-only and deterministic.",
    inputSchema: {
      type: "object",
      properties: {
        salary: { type: "number", minimum: 0, description: "Salary or wages for the year from one employer (AUD), excluding super, overtime and bonuses." },
        taxYear: { type: "string", enum: INCOME_YEAR_IDS, description: `Financial year. Default ${DEFAULT_INCOME_YEAR}.` },
        overtime: { type: "number", minimum: 0, description: "Overtime earnings for the year (AUD)." },
        bonus: { type: "number", minimum: 0, description: "Bonuses paid in the year (AUD)." },
        otherIncome: { type: "number", minimum: 0, description: "Other taxable income with no tax withheld, e.g. interest (AUD)." },
        deductions: { type: "number", minimum: 0, description: "Work-related expenses the person would itemise (AUD). From 2026-27 residents with work income get at least the $1,000 standard deduction, so amounts up to $1,000 don't change the result." },
        otherDeductions: { type: "number", minimum: 0, description: "Deductions not covered by the standard deduction, such as gifts to charity and tax agent fees (AUD)." },
        payFrequency: { type: "string", enum: ["weekly", "fortnightly", "monthly"], description: "How often the salary is paid, for tax withheld. Default fortnightly." },
        salaryIncludesSuper: { type: "boolean", description: "salary is a package including the 12% super guarantee." },
        privateHospitalCover: { type: "boolean", description: "Has private patient hospital cover all year. Default true (no Medicare levy surcharge)." },
        family: {
          type: "object",
          description: "Spouse and dependent children, for the Medicare levy family reduction and surcharge thresholds.",
          properties: {
            spouse: { type: "boolean" },
            spouseIncome: { type: "number", minimum: 0, description: "Spouse's taxable income (AUD)." },
            dependants: { type: "integer", minimum: 0, description: "Dependent children." },
          },
          additionalProperties: false,
        },
        sapto: { type: "string", enum: ["single", "couple", "illness-separated"], description: "Eligible for the seniors and pensioners tax offset, with this status." },
        ...common,
      },
      required: ["salary"],
      additionalProperties: false,
    },
    run: (a) => {
      if (a.tfnProvided === false) throw new ToolInputError("annual_tax_estimate assumes a TFN was provided; remove tfnProvided.");
      const { tfnProvided, ...rest } = a;
      return annualTax(rest);
    },
    page: (a, site) => `${site}/tax-refund-calculator/`,
  },
  {
    name: "super_guarantee",
    title: "Super guarantee",
    description: "Australian superannuation guarantee (12%) an employer must pay on ordinary time earnings, or the split of a total package that includes super into base salary and super (package divided by 1.12). Use it for 'how much super is paid on $X' or 'what is the base salary in a $X package'. Returns AUD amounts. Doesn't apply the maximum super contribution base. Read-only and deterministic.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", minimum: 0, description: "Earnings (AUD), or the total package if includesSuper is true." },
        includesSuper: { type: "boolean", description: "amount is a package that includes super. Default false." },
      },
      required: ["amount"],
      additionalProperties: false,
    },
    run: superGuarantee,
  },
  {
    name: "identifier_validation",
    title: "ABN, ACN, TFN, BSB or account number validation",
    description: "Checks an Australian Business Number (ABN), Australian Company Number (ACN) or tax file number (TFN) with the official check-digit algorithms, or the format of a BSB or bank account number. Returns valid true or false, with the normalised form or the reason it fails. Use it before storing or submitting an identifier. It confirms the number is well formed, not that it is registered or belongs to anyone: use the ABR's ABN Lookup for registration. Runs locally; nothing is sent anywhere.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: Object.keys(VALIDATORS), description: "Which identifier: abn, acn, tfn, bsb or bank_account." },
        value: { type: "string", description: "The number, with or without spaces or dashes, e.g. \"51 824 753 556\"." },
      },
      required: ["type", "value"],
      additionalProperties: false,
    },
    run: validateIdentifier,
  },
  {
    name: "tax_rates",
    title: "Australian tax rates and thresholds",
    description: "Official Australian individual tax rates and thresholds for 2025-26, 2026-27 or 2027-28: resident and foreign resident brackets, low income tax offset, Medicare levy and surcharge thresholds, HELP repayment thresholds, seniors offset and the 12% super guarantee. Use it to quote or check rates, for example the 15% rate from 1 July 2026 and 14% from 1 July 2027. To calculate tax on an amount, use take_home_pay, payg_withholding or annual_tax_estimate rather than applying the brackets by hand. Read-only.",
    inputSchema: {
      type: "object",
      properties: { taxYear: { type: "string", enum: INCOME_YEAR_IDS, description: `Financial year. Default ${DEFAULT_INCOME_YEAR}.` } },
      additionalProperties: false,
    },
    run: taxRates,
  },
];

TOOLS.splice(1, 0, {
  name: "salary_for_take_home",
  title: "Salary needed for a target take-home pay",
  description: "Works backwards from the take-home pay someone wants to the gross annual salary they need in Australia, for 2025-26 or 2026-27. Give the target take-home per week, fortnight, month or year; returns the salary needed (excluding super), the take-home and tax withheld for each pay period, and the employer's super on top. Use it for salary negotiations and questions like 'what do I need to earn to take home $1,500 a week'. It uses the same ATO withholding formulas as take_home_pay. AUD. Read-only and deterministic.",
  inputSchema: {
    type: "object",
    properties: {
      takeHome: { type: "number", minimum: 0, description: "Take-home pay wanted, in AUD, for the period in 'per', e.g. 1500." },
      per: { type: "string", enum: ["weekly", "fortnightly", "monthly", "year"], description: "The period takeHome is for." },
      taxYear: withholdingYear,
      taxFreeThreshold: common.taxFreeThreshold,
      studyLoan: common.studyLoan,
      foreignResident: common.foreignResident,
    },
    required: ["takeHome", "per"],
    additionalProperties: false,
  },
  run: salaryForTakeHome,
});
TOOLS.push({
  name: "gst_calculation",
  title: "GST calculation",
  description: "Adds 10% Australian GST to a price, or works out the GST included in a GST-inclusive price (the price divided by 11). Returns the price excluding GST, the GST and the price including GST, rounded to the cent. Use it for invoices, quotes and receipts. It doesn't decide whether an item is GST-free or input-taxed. AUD. Read-only and deterministic.",
  inputSchema: {
    type: "object",
    properties: {
      amount: { type: "number", minimum: 0, description: "The price in AUD, e.g. 110." },
      includesGst: { type: "boolean", description: "true if amount already includes GST (to take it out). Default false (GST is added)." },
    },
    required: ["amount"],
    additionalProperties: false,
  },
  run: gstCalculation,
});

export const TOOLS_BY_NAME = Object.fromEntries(TOOLS.map((t) => [t.name, t]));
// Former name, still accepted so existing integrations keep working (not listed).
TOOLS_BY_NAME.validate_au_identifier = TOOLS_BY_NAME.identifier_validation;

/** Instructions an MCP client can show its model. */
export const AGENT_INSTRUCTIONS = "Australian pay and tax calculations from the ATO's published formulas and rates. Use these tools for Australian take-home pay, PAYG withholding, income tax, tax refunds, Medicare levy, HELP repayments, super, GST and ABN/TFN questions instead of calculating from memory: rates changed on 1 July 2026 and the ATO's withholding formulas have their own rounding. Which tool: take_home_pay for a salary or hourly rate; salary_for_take_home to go from a target take-home to a salary; payg_withholding for one pay with declaration details; bonus_withholding for bonuses; annual_tax_estimate for the year's tax and refund; tax_rates to quote rates; super_guarantee, gst_calculation and identifier_validation for those tasks. Amounts are in Australian dollars. Financial years run 1 July to 30 June (e.g. 2026-27).";

// ---------- input checking ----------
function check(schema, value, path, errors) {
  const where = path || "input";
  if (schema.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) { errors.push(`${where} must be an object`); return; }
    for (const key of schema.required ?? []) if (value[key] === undefined) errors.push(`${path ? path + "." : ""}${key} is required`);
    for (const [key, v] of Object.entries(value)) {
      const sub = schema.properties?.[key];
      if (!sub) { if (schema.additionalProperties === false) errors.push(`unknown field ${path ? path + "." : ""}${key}`); continue; }
      if (v !== undefined) check(sub, v, path ? `${path}.${key}` : key, errors);
    }
    return;
  }
  if (schema.type === "number" || schema.type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value)) { errors.push(`${where} must be a number`); return; }
    if (schema.type === "integer" && !Number.isInteger(value)) errors.push(`${where} must be a whole number`);
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${where} must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${where} must be at most ${schema.maximum}`);
    return;
  }
  if (schema.type === "boolean") { if (typeof value !== "boolean") errors.push(`${where} must be true or false`); return; }
  if (schema.type === "string") {
    if (typeof value !== "string") { errors.push(`${where} must be a string`); return; }
    if (schema.enum && !schema.enum.includes(value)) errors.push(`${where} must be one of ${schema.enum.join(", ")}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${where} is not in the expected format`);
  }
}

/**
 * Run a tool by name. Throws ToolInputError for bad input (unknown tool, schema errors, or the
 * library rejecting a value) so callers can report it back to the agent as a fixable error.
 * @param {string} name
 * @param {object} args
 * @param {{ siteUrl?: string }} [ctx] siteUrl adds a link to the matching calculator page
 */
export function runTool(name, args = {}, ctx = {}) {
  const tool = TOOLS_BY_NAME[name];
  if (!tool) throw new ToolInputError(`Unknown tool ${name}. Tools: ${TOOLS.map((t) => t.name).join(", ")}`);
  const errors = [];
  check(tool.inputSchema, args ?? {}, "", errors);
  if (errors.length) throw new ToolInputError(errors.join("; "));
  let result;
  try {
    result = tool.run(args ?? {});
  } catch (err) {
    if (err instanceof ToolInputError || err instanceof RangeError || err instanceof TypeError) throw new ToolInputError(err.message);
    throw err;
  }
  if (ctx.siteUrl && tool.page) result.calculatorPage = tool.page(args ?? {}, ctx.siteUrl.replace(/\/$/, ""));
  return result;
}
