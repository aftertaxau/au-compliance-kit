// Study and training support loans withholding component for 2025-26 under the marginal repayment
// system, applying to payments made from 24 September 2025 to 30 June 2026.
// Source: Taxation Administration (Withholding Schedules) Instrument (No. 2) 2025 (F2025L01016), Schedule 8.
// Coefficients scaled by 10,000. Payments from 1 July to 23 September 2025 used the earlier
// percentage-of-earnings component, which this library does not implement.

export const STSL_FROM = "2025-09-24";

export const STSL_BANDS = {
  thresholdClaimed: [
    { lessThan: 1288, a: 0, b: 0 },
    { lessThan: 2403, a: 1500, b: 1932692 },
    { lessThan: 3447, a: 1700, b: 2413462 },
    { lessThan: null, a: 1000, b: 0 },
  ],
  noThreshold: [
    { lessThan: 938, a: 0, b: 0 },
    { lessThan: 2053, a: 1500, b: 1407692 },
    { lessThan: 2597, a: 1700, b: 1818462 },
    { lessThan: null, a: 1000, b: 0 },
  ],
};
