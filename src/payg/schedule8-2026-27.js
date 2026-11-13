// Study and training support loans (HELP, VSL, FS, SSL, AASL) withholding component, 2026-27.
// Source: LI 2026/18, Schedule 8 – Statement of formulas for calculating study and training support
// loans components (marginal repayment system from 2025-26). Coefficients scaled by 10,000.

export const STSL_BANDS = {
  // Tax-free threshold claimed, or foreign resident
  thresholdClaimed: [
    { lessThan: 1337, a: 0, b: 0 },
    { lessThan: 2494, a: 1500, b: 2005615 },
    { lessThan: 3577, a: 1700, b: 2504527 },
    { lessThan: null, a: 1000, b: 0 },
  ],
  // No tax-free threshold claimed
  noThreshold: [
    { lessThan: 987, a: 0, b: 0 },
    { lessThan: 2144, a: 1500, b: 1480615 },
    { lessThan: 2727, a: 1700, b: 1909527 },
    { lessThan: null, a: 1000, b: 0 },
  ],
};
