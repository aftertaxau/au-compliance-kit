// Page-level tax year tabs: keeps the heading and header badge in sync with the selected year,
// remembers the choice for this visitor, and tells the calculator to recalculate.
const LABELS = { "2025-26": "2025–26", "2026-27": "2026–27", "2027-28": "2027–28" };
const BADGES = { "2025-26": "2025–26 tax rates", "2026-27": "2026–27 tax rates", "2027-28": "2027–28 estimate" };
const STORAGE_KEY = "taxYear";

const radios = [...document.querySelectorAll('input[name="year"]')];

function apply(year, { save = true } = {}) {
  document.querySelectorAll("[data-year-label]").forEach((el) => { el.textContent = LABELS[year]; });
  document.querySelectorAll("[data-year-badge]").forEach((el) => {
    el.textContent = BADGES[year];
    el.classList.toggle("badge-estimate", year === "2027-28");
  });
  if (save) {
    try { localStorage.setItem(STORAGE_KEY, year); } catch { /* storage unavailable: just don't remember */ }
  }
  document.dispatchEvent(new CustomEvent("yearchange", { detail: { year } }));
}

let stored = null;
try { stored = localStorage.getItem(STORAGE_KEY); } catch { stored = null; }
const initial = radios.find((r) => r.value === stored) ?? radios.find((r) => r.checked);
if (initial) {
  initial.checked = true;
  apply(initial.value, { save: false });
}
radios.forEach((r) => r.addEventListener("change", () => apply(r.value)));
