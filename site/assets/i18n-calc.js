// Calculator on the translated pages: take-home pay per week, fortnight, month and year from a salary,
// a pay or an hourly rate. Labels come from the page (#l-strings) so one script serves every language.
import { calculateWithholding } from "./lib/index.js";
import { formatAsYouType } from "./inputs.js";

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const money0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);
const val = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
const S = JSON.parse($("l-strings").textContent);
const fmt = (cents) => money.format((cents || 0) / 100);

function render() {
  const per = val("l-per") || "year";
  $("l-hours-field").hidden = per !== "hour";
  const raw = $("l-amount").value.replace(/[$,\s]/g, "");
  const hoursRaw = $("l-hours").value.replace(/[,\s]/g, "");
  const valid = /^\d+(\.\d{0,2})?$/.test(raw) && Number(raw) > 0 && Number(raw) < 10_000_000;
  $("l-amount-error").textContent = raw && !valid ? S.error : "";
  if (!valid) {
    $("l-big").textContent = "–";
    $("l-rows").innerHTML = "";
    return;
  }
  const amount = Number(raw);
  const hours = per === "hour" ? Math.max(0, Number(hoursRaw) || 0) : 0;
  // Period amounts in cents
  let weekly, fortnightly, monthly, annual, yearBasis;
  if (per === "year") {
    annual = Math.round(amount * 100);
    weekly = Math.round(annual / 52); fortnightly = Math.round(annual / 26); monthly = Math.round(annual / 12);
    yearBasis = "fortnightly";
  } else if (per === "fortnight") {
    fortnightly = Math.round(amount * 100);
    weekly = Math.round(fortnightly / 2); monthly = Math.round((fortnightly * 26) / 12); annual = fortnightly * 26;
    yearBasis = "fortnightly";
  } else {
    weekly = Math.round(amount * 100 * (per === "hour" ? hours : 1));
    fortnightly = weekly * 2; monthly = Math.round((weekly * 52) / 12); annual = weekly * 52;
    yearBasis = "weekly";
  }
  const opts = { taxFreeThreshold: val("l-tft") !== "no", foreignResident: val("l-res") === "foreign", studyLoan: val("l-help") === "yes" };
  const tax = (cents, period) => calculateWithholding({ earnings: cents / 100, period, ...opts }).withholding * 100;
  const rows = [
    [S.week, weekly, tax(weekly, "weekly")],
    [S.fortnight, fortnightly, tax(fortnightly, "fortnightly")],
    [S.month, monthly, tax(monthly, "monthly")],
  ];
  const yearTax = yearBasis === "weekly" ? rows[0][2] * 52 : rows[1][2] * 26;
  rows.push([S.year, annual, yearTax]);
  $("l-big").textContent = fmt(fortnightly - rows[1][2]);
  $("l-rows").innerHTML = rows.map(([label, gross, t]) => `<tr><td>${label}</td><td>${fmt(t)}</td><td><strong>${fmt(gross - t)}</strong></td></tr>`).join("");
  $("l-note").textContent = S.resultNote.replace("{super}", money0.format(Math.round(annual * 0.12) / 100));
}

formatAsYouType($("l-amount"));
$("lcalc").addEventListener("input", render);
$("lcalc").addEventListener("change", render);
render();
