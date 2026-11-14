// Payslip and super checker: compares a payslip's tax and super with the ATO formulas and works out
// when super must reach the fund under Payday Super (7 business days after payday).
import { calculateWithholding } from "./lib/index.js";
import { formatAsYouType } from "./inputs.js";

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const $ = (id) => document.getElementById(id);
const val = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
const fmt = (cents) => money.format((cents || 0) / 100);
const FIELDS = ["p-gross", "p-overtime", "p-tax", "p-super"];

function parse(id, required) {
  const raw = $(id).value.replace(/[$,\s]/g, "");
  if (raw === "" || raw === ".") return required ? { empty: true } : { value: null };
  if (!/^\d*(\.\d{0,2})?$/.test(raw) || Number(raw) > 10_000_000) return { error: "Enter an amount, for example 1234.56" };
  return { value: Number(raw) };
}

/** Payday plus 7 business days (weekends skipped; public holidays not counted). */
function superDueDate(payDate) {
  const d = new Date(`${payDate}T12:00:00`);
  let added = 0;
  while (added < 7) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function verdict(diffCents, okWithin = 200) {
  if (Math.abs(diffCents) <= okWithin) return ["Matches", "ok"];
  return diffCents > 0 ? [`${fmt(diffCents)} more than expected`, "high"] : [`${fmt(-diffCents)} less than expected`, "low"];
}

function render() {
  const v = Object.fromEntries(FIELDS.map((id) => [id, parse(id, id === "p-gross" || id === "p-tax")]));
  for (const id of FIELDS) $(`${id}-error`).textContent = v[id].error ?? "";
  const ready = !v["p-gross"].empty && !v["p-tax"].empty && FIELDS.every((id) => !v[id].error);
  $("p-empty").hidden = ready;
  $("p-result").hidden = !ready;
  if (!ready) return;

  const period = val("p-period") || "fortnightly";
  const payDate = $("p-date").value || new Date().toISOString().slice(0, 10);
  let expected;
  try {
    expected = calculateWithholding({
      earnings: v["p-gross"].value,
      period,
      payDate,
      taxFreeThreshold: val("p-tft") === "yes",
      studyLoan: val("p-help") === "yes",
      foreignResident: val("p-residency") === "foreign",
      tfnProvided: val("p-tfn") === "yes",
    });
  } catch (err) {
    $("p-label").textContent = "Can't check this date";
    $("p-big").textContent = "–";
    $("p-rows").innerHTML = "";
    $("p-note").textContent = "This checker covers pays from 1 July 2025 to 30 June 2027. Choose a pay date in that range.";
    return;
  }
  const expectedTax = expected.withholding * 100;
  const actualTax = Math.round(v["p-tax"].value * 100);
  const [taxText, taxState] = verdict(actualTax - expectedTax);

  const ote = Math.max(0, v["p-gross"].value - (v["p-overtime"].value || 0));
  const expectedSuper = Math.round(ote * 100 * 0.12);
  const rows = [
    ["Tax withheld on payslip", fmt(actualTax)],
    [`Tax by the ATO formula (${expected.taxYear})`, fmt(expectedTax)],
    ["Tax check", taxText, taxState],
  ];
  let superState = null;
  if (v["p-super"].value !== null) {
    const actualSuper = Math.round(v["p-super"].value * 100);
    const [superText, s] = verdict(actualSuper - expectedSuper, 100);
    superState = s;
    rows.push(["Super on payslip", fmt(actualSuper)], ["12% of ordinary earnings", fmt(expectedSuper)], ["Super check", s === "high" ? "More than the minimum" : superText, s]);
  } else {
    rows.push(["Minimum super (12% of ordinary earnings)", fmt(expectedSuper)]);
  }
  rows.push(["Super must reach your fund by", superDueDate(payDate)]);
  $("p-rows").innerHTML = rows.map(([l, value, state]) => `<tr${state ? ` class="check-${state}"` : ""}><td>${l}</td><td>${value}</td></tr>`).join("");

  const problems = [];
  if (taxState === "low") problems.push("less tax than the formula, which could leave you with a bill at tax time");
  if (taxState === "high") problems.push("more tax than the formula");
  if (superState === "low") problems.push("less super than the 12% minimum");
  $("p-label").textContent = problems.length ? "Worth checking with payroll" : "Looks right";
  $("p-big").textContent = problems.length ? "Check" : "✓";
  $("p-big").classList.toggle("bill", problems.length > 0);
  $("p-note").textContent = problems.length
    ? `Your payslip shows ${problems.join(" and ")}. There can be good reasons (see below), so ask your payroll team before assuming it's wrong.`
    : "Tax is within $2 of the ATO formula" + (superState ? " and super meets the 12% minimum." : ".") + " Super under Payday Super is due within 7 business days of payday.";
}

FIELDS.forEach((id) => formatAsYouType($(id)));
if (!$("p-date").value) $("p-date").value = new Date().toISOString().slice(0, 10);
$("payslip").addEventListener("input", render);
$("payslip").addEventListener("change", render);
render();
