// HECS-HELP repayment calculator: compulsory repayment for the year and the extra withheld per pay.
import { studyLoanRepaymentCents, calculateWithholding, ANNUAL_YEARS } from "./lib/index.js";
import { formatAsYouType } from "./inputs.js";

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const money0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const $ = (id) => document.getElementById(id);
const val = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
const fmt = (cents) => money.format((cents || 0) / 100);
const PAYS = { weekly: 52, fortnightly: 26, monthly: 12 };
const WORD = { weekly: "week", fortnightly: "fortnight", monthly: "month" };

function render() {
  const raw = $("h-income").value.replace(/[$,\s]/g, "");
  const empty = raw === "" || raw === ".";
  const income = Number(raw);
  const error = !empty && (!/^\d*(\.\d{0,2})?$/.test(raw) || income > 10_000_000) ? "Enter an amount, for example 85000" : "";
  $("h-income-error").textContent = error;
  const ready = !empty && !error;
  $("h-empty").hidden = ready;
  $("h-result").hidden = !ready;
  if (!ready) return;

  const year = val("year") || "2026-27";
  const Y = ANNUAL_YEARS[year];
  const S = Y.studyLoan;
  const repay = studyLoanRepaymentCents(income, { taxYear: year });
  const whole = Math.floor(income);
  const band = whole <= S.threshold ? `Below the ${money0.format(S.threshold)} threshold`
    : whole <= S.secondThreshold ? `15c for each $1 over ${money0.format(S.threshold)}`
    : whole < S.topThreshold ? `${money0.format(S.secondBase)} plus 17c for each $1 over ${money0.format(S.secondThreshold)}`
    : "10% of your whole repayment income";
  $("h-big").textContent = fmt(repay);
  const rows = [
    ["Repayment income", fmt(whole * 100)],
    ["How it's worked out", band],
    ["Share of your income", whole ? `${((repay / (whole * 100)) * 100).toFixed(1)}%` : "0%"],
  ];
  const period = val("h-period") || "fortnightly";
  if (Y.withholdingYear) {
    const per = Math.round((income * 100) / PAYS[period]) / 100;
    const base = { earnings: per, period, taxYear: Y.withholdingYear };
    const extra = calculateWithholding({ ...base, studyLoan: true }).withholding - calculateWithholding(base).withholding;
    rows.push([`Extra withheld each ${WORD[period]}`, fmt(extra * 100)], ["Extra withheld over the year", fmt(extra * 100 * PAYS[period])]);
  }
  $("h-rows").innerHTML = rows.map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join("");
  $("h-note").textContent = Y.estimate
    ? "Estimate: 2027–28 thresholds aren't published yet, so the 2026–27 thresholds are used and per-pay amounts aren't shown."
    : "Per-pay amounts assume all your income is salary from one employer, with the tax-free threshold claimed. The repayment is capped at what you still owe.";
}

formatAsYouType($("h-income"));
document.getElementById("help").addEventListener("input", render);
document.getElementById("help").addEventListener("change", render);
document.addEventListener("yearchange", render);
render();
