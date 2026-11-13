// Annual individual tax rates and thresholds by income year. Amounts in whole dollars; rates in percent.
// Sources (ATO): tax rates for Australian residents and foreign residents; personal income tax cuts
// (15% from 1 July 2026, 14% from 1 July 2027); low income tax offset; Medicare levy reduction for
// low-income earners (myTax 2026); Medicare levy surcharge thresholds 2025-26 and 2026-27; study and
// training loan repayment thresholds 2025-26 and 2026-27.
// Treasury Laws Amendment (Tax Reform No. 1) Act 2026 (Royal Assent 26 June 2026): a $1,000 standard
// deduction for work-related expenses from 2026-27, and the working Australians tax offset (WATO, up to
// $250 against tax on net labour income) from 2027-28.

const LITO = { max: 700, firstThreshold: 37500, secondThreshold: 45000, secondBase: 325, cutOut: 66667 };
const FOREIGN_BRACKETS = [
  { over: 0, rate: 30, base: 0 },
  { over: 135000, rate: 37, base: 40500 },
  { over: 190000, rate: 45, base: 60850 },
];
// Medicare levy. Family reduction: no levy if family taxable income is at or below the family
// threshold ($47,238 + $4,338 per dependent child in 2025-26); reduced up to 1.25x that threshold.
const MEDICARE_2025_26 = {
  rate: 2, lowerThreshold: 28011, upperThreshold: 35013, shadeInRate: 10, familyThreshold: 47238, familyPerChild: 4338,
  // Higher thresholds for people entitled to the seniors and pensioners tax offset (SAPTO).
  sapto: { lowerThreshold: 44268, upperThreshold: 55335, familyThreshold: 61623 },
};
// Seniors and pensioners tax offset: maximum offset, reduced by 12.5c per $ of rebate income above
// the shading-out threshold; nil at the cut-out threshold (couples: half combined rebate income).
const SAPTO_2026_27 = {
  single: { max: 2230, shadeOut: 36034, cutOut: 53874 },
  couple: { max: 1602, shadeOut: 31847, cutOut: 44663 },
  illnessSeparated: { max: 2040, shadeOut: 34767, cutOut: 51087 },
};
// Medicare levy surcharge family thresholds rise by $1,500 for each dependent child after the first.
const MLS_FAMILY_2026_27 = { tiers: [210000, 246000, 328000], perChildAfterFirst: 1500 };
const MLS_2026_27 = [
  { upTo: 105000, ratePerTenThousand: 0 },
  { upTo: 123000, ratePerTenThousand: 100 },
  { upTo: 164000, ratePerTenThousand: 125 },
  { upTo: null, ratePerTenThousand: 150 },
];
const STUDY_LOAN_2026_27 = { threshold: 69528, secondThreshold: 129717, secondBase: 9028, topThreshold: 186050, topRate: 10 };

export const ANNUAL_YEARS = {
  "2025-26": {
    label: "2025–26",
    residentBrackets: [
      { over: 0, rate: 0, base: 0 },
      { over: 18200, rate: 16, base: 0 },
      { over: 45000, rate: 30, base: 4288 },
      { over: 135000, rate: 37, base: 31288 },
      { over: 190000, rate: 45, base: 51638 },
    ],
    foreignBrackets: FOREIGN_BRACKETS,
    lito: LITO,
    medicare: MEDICARE_2025_26,
    mlsSingles: [
      { upTo: 101000, ratePerTenThousand: 0 },
      { upTo: 118000, ratePerTenThousand: 100 },
      { upTo: 158000, ratePerTenThousand: 125 },
      { upTo: null, ratePerTenThousand: 150 },
    ],
    mlsFamily: { tiers: [202000, 236000, 316000], perChildAfterFirst: 1500 },
    sapto: {
      single: { max: 2230, shadeOut: 34919, cutOut: 52759 },
      couple: { max: 1602, shadeOut: 30994, cutOut: 43810 },
      illnessSeparated: { max: 2040, shadeOut: 33732, cutOut: 50052 },
    },
    studyLoan: { threshold: 67000, secondThreshold: 125000, secondBase: 8700, topThreshold: 179285, topRate: 10 },
    withholdingYear: "2025-26",
    notes: [],
  },
  "2026-27": {
    label: "2026–27",
    residentBrackets: [
      { over: 0, rate: 0, base: 0 },
      { over: 18200, rate: 15, base: 0 },
      { over: 45000, rate: 30, base: 4020 },
      { over: 135000, rate: 37, base: 31020 },
      { over: 190000, rate: 45, base: 51370 },
    ],
    foreignBrackets: FOREIGN_BRACKETS,
    lito: LITO,
    medicare: MEDICARE_2025_26,
    mlsSingles: MLS_2026_27,
    mlsFamily: MLS_FAMILY_2026_27,
    sapto: SAPTO_2026_27,
    studyLoan: STUDY_LOAN_2026_27,
    standardDeduction: 1000,
    withholdingYear: "2026-27",
    notes: ["Medicare levy low-income thresholds (single and family) for 2026-27 not yet legislated; latest legislated thresholds used"],
  },
  "2027-28": {
    label: "2027–28",
    residentBrackets: [
      { over: 0, rate: 0, base: 0 },
      { over: 18200, rate: 14, base: 0 },
      { over: 45000, rate: 30, base: 3752 },
      { over: 135000, rate: 37, base: 30752 },
      { over: 190000, rate: 45, base: 51102 },
    ],
    foreignBrackets: FOREIGN_BRACKETS,
    lito: LITO,
    medicare: MEDICARE_2025_26,
    mlsSingles: MLS_2026_27,
    mlsFamily: MLS_FAMILY_2026_27,
    sapto: SAPTO_2026_27,
    studyLoan: STUDY_LOAN_2026_27,
    standardDeduction: 1000,
    wato: { max: 250 },
    withholdingYear: null,
    estimate: true,
    notes: [
      "Estimate: 2027-28 tax rates are legislated (14% bracket), but Medicare levy, surcharge, study loan and SAPTO thresholds for 2027-28 are not yet published; the latest published thresholds are used",
      "The ATO hasn't published 2027-28 withholding tables yet, so tax withheld and the refund can't be calculated",
      "Working Australians tax offset: up to $250, limited to the income tax on net labour income; the exact phase-in formula will be set by legislative instrument, so the amount for low labour incomes is approximate",
    ],
  },
};

export const DEFAULT_INCOME_YEAR = "2026-27";
