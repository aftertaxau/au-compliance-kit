// Super guarantee helpers.
// The super guarantee rate is 12% of qualifying earnings (from 1 July 2025; unchanged under Payday Super
// from 1 July 2026). These helpers don't apply the maximum super contribution base, which only affects
// very high earners.

export const SUPER_GUARANTEE_PERCENT = 12;

/** Super guarantee on earnings, in cents (rounded to the nearest cent). */
export function superGuaranteeCents(earnings) {
  const cents = Math.round(earnings * 100);
  return Math.round((cents * SUPER_GUARANTEE_PERCENT) / 100);
}

/**
 * Split a total package that includes super into salary and super guarantee.
 * Salary = package / 1.12, super = package - salary (both rounded to the cent).
 * @param {number} packageAmount total package in dollars, including super
 */
export function splitPackage(packageAmount) {
  if (typeof packageAmount !== "number" || !Number.isFinite(packageAmount) || packageAmount < 0) {
    throw new RangeError("packageAmount must be a non-negative number");
  }
  const packageCents = Math.round(packageAmount * 100);
  const salaryCents = Math.round((packageCents * 100) / (100 + SUPER_GUARANTEE_PERCENT));
  return { salary: salaryCents / 100, superGuarantee: (packageCents - salaryCents) / 100, salaryCents, superCents: packageCents - salaryCents };
}
