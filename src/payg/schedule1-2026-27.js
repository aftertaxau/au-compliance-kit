// PAYG withholding Schedule 1 (NAT 1004) coefficients for payments made on or after 1 July 2026.
// Source: Taxation Administration (Withholding Schedules) instrument LI 2026/18, Schedule 1.
// Coefficients are stored as integers scaled by 10,000 (e.g. 0.3200 -> 3200, 181.7319 -> 1817319)
// so all arithmetic stays exact.

/** @typedef {{ lessThan: number | null, a: number, b: number }} Band */

/** @type {Record<string, Band[]>} */
export const SCALES = {
  // Scale 1: tax-free threshold not claimed
  1: [
    { lessThan: 188, a: 1500, b: 1500 },
    { lessThan: 371, a: 2084, b: 110185 },
    { lessThan: 515, a: 1790, b: 1066 },
    { lessThan: 932, a: 3227, b: 741674 },
    { lessThan: 2246, a: 3200, b: 716508 },
    { lessThan: 3303, a: 3900, b: 2288816 },
    { lessThan: null, a: 4700, b: 4931893 },
  ],
  // Scale 2: tax-free threshold claimed
  2: [
    { lessThan: 362, a: 0, b: 0 },
    { lessThan: 538, a: 1500, b: 543462 },
    { lessThan: 673, a: 2500, b: 1082135 },
    { lessThan: 721, a: 1700, b: 543473 },
    { lessThan: 865, a: 1790, b: 608377 },
    { lessThan: 1282, a: 3227, b: 1851935 },
    { lessThan: 2596, a: 3200, b: 1817319 },
    { lessThan: 3653, a: 3900, b: 3634627 },
    { lessThan: null, a: 4700, b: 6557704 },
  ],
  // Scale 3: foreign residents
  3: [
    { lessThan: 2596, a: 3000, b: 3000 },
    { lessThan: 3653, a: 3700, b: 1817308 },
    { lessThan: null, a: 4500, b: 4740385 },
  ],
  // Scale 5: full Medicare levy exemption
  5: [
    { lessThan: 362, a: 0, b: 0 },
    { lessThan: 721, a: 1500, b: 543462 },
    { lessThan: 865, a: 1590, b: 608365 },
    { lessThan: 1282, a: 3027, b: 1851923 },
    { lessThan: 2596, a: 3000, b: 1817308 },
    { lessThan: 3653, a: 3700, b: 3634615 },
    { lessThan: null, a: 4500, b: 6557692 },
  ],
  // Scale 6: half Medicare levy exemption
  6: [
    { lessThan: 362, a: 0, b: 0 },
    { lessThan: 721, a: 1500, b: 543462 },
    { lessThan: 865, a: 1590, b: 608365 },
    { lessThan: 908, a: 3027, b: 1851923 },
    { lessThan: 1135, a: 3527, b: 2306135 },
    { lessThan: 1282, a: 3127, b: 1851923 },
    { lessThan: 2596, a: 3100, b: 1817308 },
    { lessThan: 3653, a: 3800, b: 3634615 },
    { lessThan: null, a: 4600, b: 6557692 },
  ],
};

// Scale 4 (no TFN provided): flat rate in percent, applied to period earnings ignoring cents.
export const SCALE4_RATE_PERCENT = { resident: 47, foreignResident: 45 };

// Tax offsets: percentage (scaled by 10) of the annual offset claimed, per pay period.
export const TAX_OFFSET_PER_MILLE = { weekly: 19, fortnightly: 38, monthly: 83, quarterly: 250 };

// Medicare levy adjustment parameters (scales 2 and 6).
export const MEDICARE = {
  familyThreshold: 47238,
  additionalChild: 4338,
  spouseOnlyWeeklyFamilyThresholdCents: 90842, // 47,238 / 52 rounded to the cent
  2: { weeklyThreshold: 538, shadeInThreshold: 673, adjustmentFactorCents: 53867 },
  6: { weeklyThreshold: 908, shadeInThreshold: 1135, adjustmentFactorCents: 90842 },
};

// Extra weekly / fortnightly withholding a payee may request when a year has 53 / 27 pays.
export const EXTRA_PAY_WITHHOLDING = {
  weekly: [
    { from: 875, to: 2574, amount: 3 },
    { from: 2575, to: 3649, amount: 7 },
    { from: 3650, to: null, amount: 12 },
  ],
  fortnightly: [
    { from: 1700, to: 5199, amount: 12 },
    { from: 5200, to: 7249, amount: 27 },
    { from: 7250, to: null, amount: 48 },
  ],
};

export const EFFECTIVE_FROM = "2026-07-01";
export const SOURCE = "ATO LI 2026/18, Schedule 1 (NAT 1004), payments made on or after 1 July 2026";
