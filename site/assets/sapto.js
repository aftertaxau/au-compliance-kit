// Seniors and pensioners tax check: SAPTO, the low income tax offset and tax for the year.
import { estimateAnnualTax } from "./lib/index.js";
import { formatAsYouType } from "./inputs.js";

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const $ = (id) => document.getElementById(id);
const val = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
const fmt = (cents) => money.format((cents || 0) / 100);
const parse = (el) => {
  const raw = el.value.replace(/[$,\s]/g, "");
  if (raw === "" || raw === ".") return { empty: true };
  if (!/^\d*(\.\d{0,2})?$/.test(raw) || Number(raw) > 100_000_000) return { error: true };
  return { value: Number(raw) };
};

function render() {
  const status = val("s-status");
  const couple = status !== "single";
  $("s-spouse-field").hidden = !couple;
  const income = parse($("s-income"));
  const spouse = couple ? parse($("s-spouse")) : { value: 0 };
  $("s-income-error").textContent = income.error ? "Enter your taxable income for the year, for example 34,000" : "";
  $("s-spouse-error").textContent = spouse.error ? "Enter your partner's taxable income, or 0" : "";
  const ready = income.value !== undefined && (spouse.value !== undefined || spouse.empty);
  $("s-empty").hidden = ready;
  $("s-result").hidden = !ready;
  if (!ready) return;
  const year = val("s-year");
  const r = estimateAnnualTax({
    salary: 0, otherIncome: income.value, taxYear: year, sapto: status,
    family: couple ? { spouse: true, spouseIncome: spouse.value ?? 0 } : undefined,
  });
  const c = r.cents;
  $("s-big").textContent = fmt(c.totalLiability);
  $("s-sub").textContent = c.totalLiability === 0
    ? "No tax to pay on this income."
    : `Tax for the year on ${money.format(income.value)}, after your offsets.`;
  const rows = [
    ["Tax before offsets", fmt(c.grossTax)],
    ["Seniors and pensioners tax offset", `− ${fmt(c.sapto)}`],
    ["Low income tax offset", `− ${fmt(c.lito)}`],
    ["Medicare levy", fmt(c.medicare)],
    ["Total tax for the year", fmt(c.totalLiability)],
  ];
  $("s-rows").innerHTML = rows.map(([l, v], i) => `<tr${i === rows.length - 1 ? ' class="total"' : ""}><td>${l}</td><td>${v}</td></tr>`).join("");
}

formatAsYouType($("s-income"));
formatAsYouType($("s-spouse"));
$("sapto").addEventListener("input", render);
$("sapto").addEventListener("change", render);
render();
