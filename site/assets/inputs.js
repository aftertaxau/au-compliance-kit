// Number input formatting: only digits (and one decimal point where allowed), commas added as you
// type, and the caret kept in the right place.

/**
 * @param {HTMLInputElement | null} input
 * @param {{ decimals?: number, commas?: boolean }} [opts]
 */
export function formatAsYouType(input, { decimals = 2, commas = true } = {}) {
  if (!input) return;
  const clean = () => {
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const allowed = decimals > 0 ? /[0-9.]/ : /[0-9]/;
    const keptBeforeCaret = [...raw.slice(0, caret)].filter((ch) => allowed.test(ch)).length;

    let digits = [...raw].filter((ch) => allowed.test(ch)).join("");
    const dot = digits.indexOf(".");
    if (dot !== -1) digits = digits.slice(0, dot + 1) + digits.slice(dot + 1).replace(/\./g, "");
    let [whole, fraction] = digits.split(".");
    whole = whole.replace(/^0+(?=\d)/, "");
    if (fraction !== undefined) fraction = fraction.slice(0, decimals);
    const wholeOut = commas ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole;
    const out = fraction !== undefined ? `${wholeOut}.${fraction}` : wholeOut;
    if (out === raw) return;

    input.value = out;
    let pos = 0;
    for (let count = 0; pos < out.length && count < keptBeforeCaret; pos++) {
      if (allowed.test(out[pos])) count++;
    }
    try { input.setSelectionRange(pos, pos); } catch { /* some input types don't support selection */ }
  };
  input.addEventListener("input", clean);
  clean();
}
