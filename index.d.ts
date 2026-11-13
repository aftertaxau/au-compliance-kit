export type PayPeriod = "weekly" | "fortnightly" | "monthly" | "quarterly";

export interface WithholdingInput {
  /** Gross earnings for the pay period in dollars, including allowances subject to withholding. */
  earnings: number;
  period: PayPeriod;
  /** Defaults to true. False applies scale 4 (no TFN provided). */
  tfnProvided?: boolean;
  /** Defaults to false. */
  foreignResident?: boolean;
  /** Whether the payee claimed the tax-free threshold. Defaults to true. */
  taxFreeThreshold?: boolean;
  /** Defaults to "none". */
  medicareExemption?: "none" | "full" | "half";
  /** Total annual tax offsets claimed on the Withholding declaration. */
  annualTaxOffset?: number;
  /** Medicare levy variation declaration: spouse and/or dependent children. */
  medicareFamily?: { spouse?: boolean; children?: number };
  /** YYYY-MM-DD. Selects the financial year's tables; throws outside 1 July 2025 – 30 June 2027. */
  payDate?: string;
  /** Tables to use when no payDate is given. Defaults to "2026-27". */
  taxYear?: "2025-26" | "2026-27";
  /** Throws if true: working holiday makers need Schedule 15. */
  workingHolidayMaker?: boolean;
  /** HELP or other study and training support loan debt: adds the Schedule 8 component. */
  studyLoan?: boolean;
  /** Payee claims the seniors and pensioners tax offset: uses Schedule 9 for this status. */
  seniors?: "single" | "couple" | "illness-separated";
}

export interface AnnualTaxInput {
  /** Annual salary or wages from one employer, excluding super, overtime and bonuses. */
  salary: number;
  /** Defaults to "2026-27". "2027-28" is an estimate with no withholding or refund. */
  taxYear?: "2025-26" | "2026-27" | "2027-28";
  /** Overtime earnings for the year, spread across pays (no super guarantee). */
  overtime?: number;
  /** Bonuses paid as a single payment in the year (Schedule 5 Method A withholding). */
  bonus?: number;
  /** Spouse and dependent children: Medicare levy family reduction and family surcharge thresholds. */
  family?: Family;
  payFrequency?: "weekly" | "fortnightly" | "monthly";
  /** Other taxable income with no tax withheld. */
  otherIncome?: number;
  /** Work-related expenses you'd itemise. From 2026-27 residents with labour income get at least the $1,000 standard deduction instead. */
  deductions?: number;
  /** Deductions not covered by the standard deduction (gifts and donations, cost of managing tax affairs). */
  otherDeductions?: number;
  foreignResident?: boolean;
  studyLoan?: boolean;
  /** Defaults to true (no Medicare levy surcharge). */
  privateHospitalCover?: boolean;
  /** Claimed with this employer; affects withholding only. Defaults to true. */
  taxFreeThreshold?: boolean;
  /** Treat salary as a total package including the 12% super guarantee. Defaults to false. */
  salaryIncludesSuper?: boolean;
  /** Eligible for the seniors and pensioners tax offset (true picks single or couple from family). */
  sapto?: boolean | "single" | "couple" | "illness-separated";
}

export interface AnnualTaxResult {
  incomeYear: string;
  /** True for years where thresholds or withholding tables aren't published yet. */
  estimate: boolean;
  /** Salary excluding super, in dollars. */
  salary: number;
  /** Super guarantee on that salary, in dollars. */
  superGuarantee: number;
  /** Whole dollars. */
  taxableIncome: number;
  /** Work-related deductions used: itemised amount or the standard deduction (2026-27 on), whichever is higher. */
  workDeductions: number;
  standardDeductionUsed: boolean;
  /** All amounts in cents. refund is negative when there is a bill. */
  /** withheld and refund are null when no withholding tables exist for the year (2027-28). */
  cents: { grossTax: number; lito: number; sapto: number; wato: number; medicare: number; mls: number; studyLoan: number; totalLiability: number; withheld: number | null; bonusWithheld: number; refund: number | null };
  perPayWithholding: number | null;
  assumptions: string[];
}

export function estimateAnnualTax(input: AnnualTaxInput): AnnualTaxResult;
export function incomeTaxCents(taxableIncome: number, opts?: { foreignResident?: boolean }): number;
export function litoCents(taxableIncome: number): number;
export interface Family { spouse?: boolean; spouseIncome?: number; dependants?: number }
export function medicareLevyCents(taxableIncome: number, opts?: { foreignResident?: boolean; exemption?: "none" | "full" | "half"; taxYear?: string; family?: Family; sapto?: boolean }): number;
/** Seniors and pensioners tax offset in cents (income tests applied; eligibility assumed). */
export function saptoCents(rebateIncome: number, opts?: { status?: "single" | "couple" | "illness-separated"; spouseRebateIncome?: number; taxYear?: string }): number;
/** Medicare levy with single and family reductions using explicit thresholds (e.g. SAPTO thresholds). */
export function reducedMedicareLevyCents(input: {
  taxableIncome: number;
  single: { rate: number; lowerThreshold: number; upperThreshold: number; shadeInRate: number };
  family?: Family;
  familyThreshold?: number;
  familyPerChild?: number;
}): number;
export function medicareLevySurchargeCents(income: number, opts?: { privateHospitalCover?: boolean; foreignResident?: boolean; taxYear?: string; family?: Family }): number;
export function studyLoanRepaymentCents(repaymentIncome: number): number;
export const SUPER_GUARANTEE_PERCENT: number;
export function superGuaranteeCents(earnings: number): number;
/** Split a package including super into salary (package / 1.12) and super guarantee. */
export function splitPackage(packageAmount: number): { salary: number; superGuarantee: number; salaryCents: number; superCents: number };
export function weeklyStudyLoanComponent(dollars: number, thresholdClaimedOrForeign?: boolean): number;

export interface WithholdingResult {
  /** Amount to withhold for the period, in whole dollars. */
  withholding: number;
  taxYear: "2025-26" | "2026-27";
  /** ATO Schedule 1 scale applied (1-6). */
  /** ATO Schedule 1 scale (1-6), or "seniors-<status>" for Schedule 9. */
  scale: 1 | 2 | 3 | 4 | 5 | 6 | "seniors-single" | "seniors-couple" | "seniors-illness-separated";
  breakdown: { scaleAmount: number; taxOffset: number; medicareAdjustment: number; studyLoanComponent?: number };
  source: string;
}

export function calculateWithholding(input: WithholdingInput): WithholdingResult;
export function extraPayWithholding(earnings: number, period: "weekly" | "fortnightly"): number;
export function taxOffsetForPeriod(annualOffset: number, period: PayPeriod): number;
export function weeklyEquivalentDollars(cents: number, period: PayPeriod): number;
export function weeklyMedicareAdjustment(scale: 2 | 6, dollars: number, family?: { spouse?: boolean; children?: number }): number;
export function weeklyScaleAmount(scale: 1 | 2 | 3 | 5 | 6, dollars: number): number;
export const PAYG_EFFECTIVE_FROM: string;
export const PAYG_SOURCE: string;

export type ValidationResult = { valid: true; normalised: string } | { valid: false; normalised: null; reason: string };
export function validateAbn(value: string | number): ValidationResult;
export function validateAcn(value: string | number): ValidationResult;
export function validateTfn(value: string | number): ValidationResult;
export function validateBsbFormat(value: string | number): ValidationResult;
export function validateAccountNumberFormat(value: string | number): ValidationResult;

/** Schedule 5 Method A withholding on a bonus, commission or similar payment made with a regular pay. */
export function calculateBonusWithholding(input: WithholdingInput & { bonus: number; periodsCovered?: number }): {
  withholding: number;
  breakdown: { tax: number; studyLoanComponent: number; cap: number };
  taxYear?: "2025-26" | "2026-27";
};
export function resolveWithholdingYear(opts?: { taxYear?: string; payDate?: string }): "2025-26" | "2026-27";
export const WITHHOLDING_YEARS: Record<"2025-26" | "2026-27", { from: string; to: string }>;
export const DEFAULT_WITHHOLDING_YEAR: "2026-27";
export const ANNUAL_YEARS: Record<"2025-26" | "2026-27" | "2027-28", { label: string; estimate?: boolean; notes: string[] }>;
export const DEFAULT_INCOME_YEAR: "2026-27";
/** Overtime earnings in dollars (e.g. multiplier 1.5 for time and a half). */
export function overtimeEarnings(input: { hourlyRate: number; hours: number; multiplier?: number }): number;
