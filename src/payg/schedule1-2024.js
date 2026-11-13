// PAYG withholding Schedule 1 (NAT 1004) coefficients last updated 1 July 2024, used for payments
// made from 1 July 2025 to 30 June 2026 (the 2025-26 year).
// Source: Taxation Administration (Withholding Schedules) Instrument 2025 (F2025L00647) and
// Instrument (No. 2) 2025 (F2025L01016), Schedule 1. Coefficients scaled by 10,000.

export const SCALES = {
  1: [
    { lessThan: 150, a: 1600, b: 1600 },
    { lessThan: 371, a: 2117, b: 77550 },
    { lessThan: 515, a: 1890, b: -6702 }, // negative b is intentional in the ATO schedule
    { lessThan: 932, a: 3227, b: 682367 },
    { lessThan: 2246, a: 3200, b: 657202 },
    { lessThan: 3303, a: 3900, b: 2229510 },
    { lessThan: null, a: 4700, b: 4872587 },
  ],
  2: [
    { lessThan: 361, a: 0, b: 0 },
    { lessThan: 500, a: 1600, b: 578462 },
    { lessThan: 625, a: 2600, b: 1078462 },
    { lessThan: 721, a: 1800, b: 578462 },
    { lessThan: 865, a: 1890, b: 643365 },
    { lessThan: 1282, a: 3227, b: 1800385 },
    { lessThan: 2596, a: 3200, b: 1765769 },
    { lessThan: 3653, a: 3900, b: 3583077 },
    { lessThan: null, a: 4700, b: 6506154 },
  ],
  3: [
    { lessThan: 2596, a: 3000, b: 3000 },
    { lessThan: 3653, a: 3700, b: 1817308 },
    { lessThan: null, a: 4500, b: 4740385 },
  ],
  5: [
    { lessThan: 361, a: 0, b: 0 },
    { lessThan: 721, a: 1600, b: 578462 },
    { lessThan: 865, a: 1690, b: 643365 },
    { lessThan: 1282, a: 3027, b: 1800385 },
    { lessThan: 2596, a: 3000, b: 1765769 },
    { lessThan: 3653, a: 3700, b: 3583077 },
    { lessThan: null, a: 4500, b: 6506154 },
  ],
  6: [
    { lessThan: 361, a: 0, b: 0 },
    { lessThan: 721, a: 1600, b: 578462 },
    { lessThan: 843, a: 1690, b: 643365 },
    { lessThan: 865, a: 2190, b: 1064962 },
    { lessThan: 1053, a: 3527, b: 2221981 },
    { lessThan: 1282, a: 3127, b: 1800385 },
    { lessThan: 2596, a: 3100, b: 1765769 },
    { lessThan: 3653, a: 3800, b: 3583077 },
    { lessThan: null, a: 4600, b: 6506154 },
  ],
};

export const SCALE4_RATE_PERCENT = { resident: 47, foreignResident: 45 };
export const TAX_OFFSET_PER_MILLE = { weekly: 19, fortnightly: 38, monthly: 83, quarterly: 250 };

export const MEDICARE = {
  familyThreshold: 43846,
  additionalChild: 4027,
  spouseOnlyWeeklyFamilyThresholdCents: 84319, // 43,846 / 52 rounded to the cent
  2: { weeklyThreshold: 500, shadeInThreshold: 625, adjustmentFactorCents: 50000 },
  6: { weeklyThreshold: 843, shadeInThreshold: 1053, adjustmentFactorCents: 84319 },
};

export const EXTRA_PAY_WITHHOLDING = {
  weekly: [
    { from: 875, to: 2574, amount: 3 },
    { from: 2575, to: 3649, amount: 6 },
    { from: 3650, to: null, amount: 12 },
  ],
  fortnightly: [
    { from: 1750, to: 5149, amount: 12 },
    { from: 5150, to: 7249, amount: 26 },
    { from: 7250, to: null, amount: 47 },
  ],
};

export const SOURCE = "ATO Schedule 1 (NAT 1004) last updated 1 July 2024, used for payments made 1 July 2025 to 30 June 2026";
