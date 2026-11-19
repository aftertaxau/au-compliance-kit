// Two jobs: is enough tax withheld across both? Main job claims the tax-free threshold, the second
// job doesn't, and the year's withholding is compared with the tax on the combined income (2026-27).
import { calculateWithholding, estimateAnnualTax } from "./lib/index.js";
import { formatAsYouType } from "./inputs.js";

const money0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);
const val = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
const PAYS = { weekly: 52, fortnightly: 26, monthly: 12 };
const WORD = { weekly: "week", fortnightly: "fortnight", monthly: "month" };
const parse = (el) => {
  const raw = el.value.replace(/[$,\s]/g, "");
  if (raw === "" || raw === ".") return { empty: true };
  if (!/^\d*(\.\d{0,2})?$/.test(raw) || Number(raw) > 10_000_000) return { error: true };
  return { value: Number(raw) };
};

function render() {
  const period = val("j-period");
  const word = WORD[period];
  const main = parse($("j-main"));
  const second = parse($("j-second"));
  $("j-main-error").textContent = main.error ? `Enter your main job's pay a ${word}, for example 1,200` : "";
  $("j-second-error").textContent = second.error ? `Enter your second job's pay a ${word}, for example 400` : "";
  const ready = main.value !== undefined && second.value !== undefined;
  $("j-empty").hidden = ready;
  $("j-result").hidden = !ready;
  if (!ready) return;
  const studyLoan = val("j-loan") === "yes";
  const common = { period, taxYear: "2026-27", studyLoan };
  const w1 = calculateWithholding({ earnings: main.value, ...common }).withholding;
  const w2 = calculateWithholding({ earnings: second.value, taxFreeThreshold: false, ...common }).withholding;
  const n = PAYS[period];
  const income = Math.round((main.value + second.value) * n);
  const tax = estimateAnnualTax({ salary: income, taxYear: "2026-27", payFrequency: period, studyLoan }).cents.totalLiability / 100;
  const withheld = (w1 + w2) * n;
  const diff = Math.round(withheld - tax);
  $("j-big").textContent = diff >= 0 ? `${money0.format(diff)} back` : `${money0.format(-diff)} short`;
  $("j-sub").textContent = diff >= 0
    ? "Enough tax is withheld across both jobs. The difference comes back as a refund when you lodge."
    : `To cover it, ask your second employer to withhold about ${money0.format(Math.ceil(-diff / n))} more each ${word}.`;
  const rows = [
    [`Withheld from your main job (${money0.format(w1)} a ${word})`, money0.format(w1 * n)],
    [`Withheld from your second job (${money0.format(w2)} a ${word})`, money0.format(w2 * n)],
    ["Total withheld over the year", money0.format(withheld)],
    [`Tax for the year on ${money0.format(income)}`, money0.format(tax)],
    [diff >= 0 ? "Estimated refund" : "Estimated amount owing", money0.format(Math.abs(diff))],
  ];
  $("j-rows").innerHTML = rows.map(([l, v], i) => `<tr${i === rows.length - 1 ? ' class="total"' : ""}><td>${l}</td><td>${v}</td></tr>`).join("");
}

formatAsYouType($("j-main"));
formatAsYouType($("j-second"));
$("secondjob").addEventListener("input", render);
$("secondjob").addEventListener("change", render);
render();
