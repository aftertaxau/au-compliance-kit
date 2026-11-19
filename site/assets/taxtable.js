// Tax table lookup: exact tax withheld for one weekly, fortnightly or monthly amount (2026-27 formulas).
// The pay period comes from a t-period toggle when the page has one (else data-period), and the
// seniors tax table page adds a t-status toggle for the seniors and pensioners tax offset.
import { calculateWithholding } from "./lib/index.js";
import { formatAsYouType } from "./inputs.js";

const money0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const $ = (id) => document.getElementById(id);
const val = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
const form = $("taxtable");
const WORD = { weekly: "week", fortnightly: "fortnight", monthly: "month" };

function render() {
  const period = val("t-period") ?? form.dataset.period;
  const raw = $("t-amount").value.replace(/[$,\s]/g, "");
  const empty = raw === "" || raw === ".";
  const error = !empty && (!/^\d*(\.\d{0,2})?$/.test(raw) || Number(raw) > 10_000_000) ? `Enter your ${period} pay, for example 2,000` : "";
  $("t-amount-error").textContent = error;
  const ready = !empty && !error;
  $("t-empty").hidden = ready;
  $("t-result").hidden = !ready;
  if (!ready) return;
  const earnings = Number(raw);
  const r = calculateWithholding({ earnings, period, taxYear: "2026-27", taxFreeThreshold: val("t-tft") !== "no", studyLoan: val("t-loan") === "yes", seniors: val("t-status") });
  const loan = r.breakdown.studyLoanComponent;
  $("t-big").textContent = money0.format(r.withholding);
  const rows = [["Gross pay", money.format(earnings)], ["Tax withheld", money0.format(r.withholding - loan)]];
  if (loan) rows.push(["Study loan repayment withheld", money0.format(loan)]);
  rows.push([`Take-home pay a ${WORD[period]}`, money.format(earnings - r.withholding)]);
  $("t-rows").innerHTML = rows.map(([l, v], i) => `<tr${i === rows.length - 1 ? ' class="total"' : ""}><td>${l}</td><td>${v}</td></tr>`).join("");
}

formatAsYouType($("t-amount"));
form.addEventListener("input", render);
form.addEventListener("change", render);
render();
