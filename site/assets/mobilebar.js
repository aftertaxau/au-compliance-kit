// Phones: a slim bar pinned to the bottom of the screen showing the main result while you fill in
// the form. It hides itself when the full result card is on screen, and tapping it scrolls there.
const PHONE = window.matchMedia("(max-width: 900px)");
// "armed" waits for the visitor to change something, so pre-filled calculators (salary pages) don't show it.
const state = { label: "", value: "", bill: false, resultVisible: false, result: null, armed: false };
let bar;

function refresh() {
  if (!bar) return;
  const show = state.armed && Boolean(state.value) && !state.resultVisible && PHONE.matches;
  bar.hidden = !show;
  document.body.classList.toggle("has-mobile-bar", show);
}

/** Create the bar for a calculator's result card. */
export function initMobileBar(resultEl) {
  if (!resultEl || bar) return;
  state.result = resultEl;
  bar = document.createElement("div");
  bar.className = "mobile-bar";
  bar.hidden = true;
  bar.innerHTML = '<div class="mb-text"><span class="mb-label"></span><strong class="mb-value"></strong></div><button type="button" class="mb-go">See breakdown</button>';
  document.body.appendChild(bar);
  bar.querySelector(".mb-go").addEventListener("click", () => {
    const top = resultEl.getBoundingClientRect().top + window.scrollY - 76; // clear the page header
    window.scrollTo({ top, behavior: "smooth" });
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      state.resultVisible = entry.isIntersecting;
      refresh();
    }, { threshold: 0.35 }).observe(resultEl);
  }
  PHONE.addEventListener?.("change", refresh);
  const form = resultEl.closest("form");
  const arm = (e) => { if (e.isTrusted && !state.armed) { state.armed = true; refresh(); } };
  form?.addEventListener("input", arm);
  form?.addEventListener("change", arm);
}

/** Update the bar; pass a falsy value to hide it (no result yet). */
export function updateMobileBar(label, value, { bill = false } = {}) {
  state.label = label || "";
  state.value = value || "";
  state.bill = bill;
  if (bar) {
    bar.querySelector(".mb-label").textContent = state.label;
    const v = bar.querySelector(".mb-value");
    v.textContent = state.value;
    v.classList.toggle("bill", bill);
  }
  refresh();
}
