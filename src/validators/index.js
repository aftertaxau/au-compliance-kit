// Check-digit and format validators for Australian identifiers.
// ABN: ABR published algorithm (weights 10,1,3,...,19; first digit minus 1; sum mod 89).
// ACN: ASIC published algorithm (weights 8..1; complement of sum mod 10).
// TFN: ATO check-digit algorithm (9-digit weights 1,4,3,7,5,8,6,9,10; legacy 8-digit weights 10,7,8,4,6,3,5,1; sum mod 11).

const digitsOnly = (value) => String(value ?? "").replace(/[\s-]/g, "");

function result(valid, normalised, reason) {
  return valid ? { valid: true, normalised } : { valid: false, normalised: null, reason };
}

/** Validate an Australian Business Number (11 digits, mod 89 check). */
export function validateAbn(value) {
  const s = digitsOnly(value);
  if (!/^\d{11}$/.test(s)) return result(false, null, "An ABN has exactly 11 digits");
  if (s[0] === "0") return result(false, null, "An ABN cannot start with 0");
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const sum = [...s].reduce((acc, ch, i) => acc + (i === 0 ? Number(ch) - 1 : Number(ch)) * weights[i], 0);
  if (sum % 89 !== 0) return result(false, null, "ABN check digits do not match");
  return result(true, `${s.slice(0, 2)} ${s.slice(2, 5)} ${s.slice(5, 8)} ${s.slice(8)}`);
}

/** Validate an Australian Company Number (9 digits, complement-of-mod-10 check digit). */
export function validateAcn(value) {
  const s = digitsOnly(value);
  if (!/^\d{9}$/.test(s)) return result(false, null, "An ACN has exactly 9 digits");
  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  const sum = weights.reduce((acc, w, i) => acc + Number(s[i]) * w, 0);
  const check = (10 - (sum % 10)) % 10;
  if (check !== Number(s[8])) return result(false, null, "ACN check digit does not match");
  return result(true, `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}`);
}

/** Validate a Tax File Number (9 digits, or legacy 8 digits) by check digit. Never log or store TFNs in plain text. */
export function validateTfn(value) {
  const s = digitsOnly(value);
  let weights;
  if (/^\d{9}$/.test(s)) weights = [1, 4, 3, 7, 5, 8, 6, 9, 10];
  else if (/^\d{8}$/.test(s)) weights = [10, 7, 8, 4, 6, 3, 5, 1];
  else return result(false, null, "A TFN has 9 digits (or 8 for some older TFNs)");
  const sum = weights.reduce((acc, w, i) => acc + Number(s[i]) * w, 0);
  if (sum % 11 !== 0) return result(false, null, "TFN check digit does not match");
  return result(true, s.length === 9 ? `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6)}` : s);
}

/**
 * Validate the format of a BSB (6 digits, written 000-000).
 * Format only: whether the BSB exists and accepts payments requires the AusPayNet BSB directory.
 */
export function validateBsbFormat(value) {
  const s = digitsOnly(value);
  if (!/^\d{6}$/.test(s)) return result(false, null, "A BSB has exactly 6 digits");
  return result(true, `${s.slice(0, 3)}-${s.slice(3)}`);
}

/** Validate an Australian bank account number format (5 to 9 digits; there is no national check digit). */
export function validateAccountNumberFormat(value) {
  const s = digitsOnly(value);
  if (!/^\d{5,9}$/.test(s)) return result(false, null, "An Australian account number has 5 to 9 digits");
  return result(true, s);
}
