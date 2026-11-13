import { estimateAnnualTax, ANNUAL_YEARS } from "./lib/index.js";
import { formatAsYouType } from "./inputs.js";
import { initMobileBar, updateMobileBar } from "./mobilebar.js";

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const money0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);
const val = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
const fmt = (cents) => money.format((cents || 0) / 100);
const FIELDS = ["r-salary", "r-overtime", "r-bonus", "r-other", "r-deductions", "r-spouse"];

function parseMoney(raw, { required = false } = {}) {
  const cleaned = String(raw).replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === ".") return required ? { empty: true } : { value: 0 };
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return { error: "Enter an amount, for example 85000" };
  const value = Number(cleaned);
  if (value > 10_000_000) return { error: "That amount is too large for this calculator" };
  return { value };
}

function render() {
  const v = Object.fromEntries(FIELDS.map((id) => [id, parseMoney($(id).value, { required: id === "r-salary" })]));
  for (const id of FIELDS) $(`${id}-error`).textContent = v[id].error ?? "";
  const familyType = val("r-family");
  $("r-family-fields").hidden = familyType === "single";
  $("r-spouse-field").hidden = familyType !== "couple";
  const childrenRaw = $("r-children").value.trim();
  const children = childrenRaw === "" ? 0 : Number(childrenRaw);
  const childrenError = !Number.isInteger(children) || children < 0 || children > 20 ? "Enter a whole number of children" : "";
  $("r-children-error").textContent = childrenError;
  const ready = FIELDS.every((id) => !v[id].error) && !v["r-salary"].empty && !childrenError;
  $("r-empty").hidden = ready;
  $("r-result").hidden = !ready;
  if (!ready) { updateMobileBar(null); return; }

  const help = val("r-help") === "yes";
  const input = {
    taxYear: val("year"),
    salary: v["r-salary"].value,
    overtime: v["r-overtime"].value,
    bonus: v["r-bonus"].value,
    otherIncome: v["r-other"].value,
    deductions: v["r-deductions"].value,
    payFrequency: val("r-period"),
    foreignResident: val("r-residency") === "foreign",
    studyLoan: help,
    privateHospitalCover: val("r-cover") === "yes",
    taxFreeThreshold: val("r-tft") === "yes",
    salaryIncludesSuper: val("r-super") === "yes",
    sapto: val("r-sapto") === "yes",
    family: familyType === "single" ? undefined
      : { spouse: familyType === "couple", spouseIncome: familyType === "couple" ? v["r-spouse"].value : 0, dependants: children },
  };
  const r = estimateAnnualTax(input);
  const c = r.cents;
  const hasRefund = c.refund !== null;
  const isRefund = hasRefund && c.refund >= 0;
  $("r-label").textContent = !hasRefund ? "Estimated tax for the year" : isRefund ? "Estimated tax refund" : "Estimated tax bill";
  $("r-big").textContent = fmt(hasRefund ? Math.abs(c.refund) : c.totalLiability);
  $("r-big").classList.toggle("bill", hasRefund && !isRefund);
  updateMobileBar($("r-label").textContent, $("r-big").textContent, { bill: hasRefund && !isRefund });

  const rows = [];
  if (val("r-super") === "yes") rows.push(["Salary excluding super", Math.round(r.salary * 100)]);
  rows.push(["Taxable income", r.taxableIncome * 100], ["Income tax", c.grossTax], ["Low income tax offset", -c.lito]);
  if (val("r-sapto") === "yes") rows.push(["Seniors and pensioners tax offset", -c.sapto]);
  rows.push(["Medicare levy", c.medicare]);
  if (c.mls) rows.push(["Medicare levy surcharge", c.mls]);
  if (help) rows.push(["Study loan repayment", c.studyLoan]);
  rows.push(["Total tax for the year", c.totalLiability, "total"]);
  if (hasRefund) {
    rows.push(["Tax withheld by your employer", c.withheld]);
    rows.push([isRefund ? "Estimated refund" : "Estimated amount owing", Math.abs(c.refund), "total"]);
  }
  rows.push(["Super paid by employer", Math.round(r.superGuarantee * 100)]);
  $("r-rows").innerHTML = rows.map(([label, cents, cls]) => {
    const shown = cents < 0 ? `−${fmt(-cents)}` : fmt(cents);
    return `<tr${cls ? ` class="${cls}"` : ""}><td>${label}</td><td>${shown}</td></tr>`;
  }).join("");

  const notes = [];
  if (r.estimate) notes.push("2027–28 is an estimate: the 14% rate is law, but the ATO hasn't published the 2027–28 withholding tables or thresholds, so we can't work out tax withheld or a refund yet.");
  if (val("r-sapto") === "yes") {
    if (val("r-residency") === "foreign") notes.push("The seniors and pensioners tax offset is only for Australian residents.");
    else if (c.sapto > 0) notes.push(`The seniors and pensioners tax offset saves you ${fmt(c.sapto)}, and tax withheld uses the ATO's seniors tax table.`);
    else notes.push("Your income is above the limit for the seniors and pensioners tax offset" + (familyType === "couple" ? " (based on half your combined income)" : "") + ".");
  }
  if (v["r-other"].value > 0) notes.push("No tax is withheld from other income, which is why it can lead to a bill.");
  if (v["r-bonus"].value > 0 && hasRefund) notes.push(`Tax withheld includes ${fmt(c.bonusWithheld)} taken from your bonus.`);
  if (v["r-overtime"].value > 0) notes.push("Super usually isn't paid on overtime.");
  if (c.mls) notes.push("You pay the Medicare levy surcharge because your income is above the threshold and you don't have private hospital cover.");
  if (familyType !== "single") {
    const M = ANNUAL_YEARS[val("year")].medicare;
    const limit = Math.round((M.familyThreshold + M.familyPerChild * children) * 1.25);
    const singleLevy = estimateAnnualTax({ ...input, family: undefined }).cents.medicare;
    if (c.medicare < singleLevy) notes.push(`The Medicare levy family reduction saves you ${fmt(singleLevy - c.medicare)}. Tax withheld assumes you haven't lodged a Medicare levy variation declaration.`);
    else notes.push(`Your family income is above the limit for the Medicare levy family reduction (about ${money0.format(limit)} for your family), so the levy isn't reduced.`);
  }
  $("r-note").textContent = notes.join(" ");
}

initMobileBar(document.querySelector("#refund .calc-result"));
["r-salary", "r-overtime", "r-bonus", "r-other", "r-deductions", "r-spouse"].forEach((id) => formatAsYouType($(id)));
formatAsYouType($("r-children"), { decimals: 0, commas: false });
$("refund").addEventListener("input", render);
$("refund").addEventListener("change", render);
document.addEventListener("yearchange", render);
render();
