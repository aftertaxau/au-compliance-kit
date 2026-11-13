// Overtime pay. Overtime is added to the pay period's earnings for withholding (Schedule 1) and is
// generally not ordinary time earnings, so the super guarantee usually doesn't apply to it.

/**
 * Overtime earnings in dollars, rounded to the cent.
 * @param {{ hourlyRate: number, hours: number, multiplier?: number }} input e.g. multiplier 1.5 for time and a half
 */
export function overtimeEarnings({ hourlyRate, hours, multiplier = 1.5 } = {}) {
  for (const [name, v] of Object.entries({ hourlyRate, hours, multiplier })) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw new RangeError(`${name} must be a non-negative number`);
  }
  return Math.round(hourlyRate * hours * multiplier * 100) / 100;
}
