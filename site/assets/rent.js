// Rent vs take-home pay: median rent for the chosen area as a share of weekly take-home pay.
import { calculateWithholding } from "./lib/index.js";
import { formatAsYouType } from "./inputs.js";

const money0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const $ = (id) => document.getElementById(id);
const areas = JSON.parse($("rent-data").textContent);
const TYPES = [["a", "All homes"], ["u1", "1-bedroom unit"], ["u2", "2-bedroom unit"], ["h3", "3-bedroom house"]];

const amount = (id) => {
  const raw = $(id).value.replace(/[$,\s]/g, "");
  return /^\d+(\.\d{0,2})?$/.test(raw) ? Number(raw) : 0;
};
/** Weekly take-home in cents for an annual salary (main job, tax-free threshold claimed). */
function weeklyNet(salary) {
  if (!salary) return 0;
  const weekly = Math.round((salary * 100) / 52) / 100;
  return Math.round(weekly * 100) - calculateWithholding({ earnings: weekly, period: "weekly" }).withholding * 100;
}

function render() {
  const area = areas.find((a) => a.p === $("r-area").value) || areas[0];
  const salary = amount("r-salary-in");
  const partner = amount("r-partner");
  const net = weeklyNet(salary) + weeklyNet(partner);
  if (!net) {
    $("rent-big").textContent = "–";
    $("rent-rows").innerHTML = "";
    $("rent-note").textContent = "Enter a salary to compare.";
    return;
  }
  const pct = (rent) => Math.round(((rent * 100) / net) * 100);
  $("rent-label").textContent = `Median rent in ${area.n} as a share of take-home pay`;
  $("rent-big").textContent = `${pct(area.a)}%`;
  $("rent-big").classList.toggle("bill", pct(area.a) > 40);
  $("rent-rows").innerHTML = TYPES.filter(([k]) => area[k]).map(([k, label]) => `<tr><td>${label}</td><td>${money0.format(area[k])}</td><td>${pct(area[k])}%</td></tr>`).join("");
  const left = net - area.a * 100;
  $("rent-note").textContent = `Take-home pay ${money.format(net / 100)} a week${partner ? " (both incomes)" : ""}. After the median rent you'd have ${money.format(Math.max(0, left) / 100)} a week left. Rent above 30% of gross income is often called rental stress.`;
}

["r-salary-in", "r-partner"].forEach((id) => formatAsYouType($(id)));
$("rent").addEventListener("input", render);
$("rent").addEventListener("change", render);
render();
