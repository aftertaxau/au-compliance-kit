// GST calculator: add 10% GST to a price, or find the GST included in one.
import { formatAsYouType } from "./inputs.js";

const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const $ = (id) => document.getElementById(id);
const fmt = (cents) => money.format((cents || 0) / 100);

function render() {
  const raw = $("g-amount").value.replace(/[$,\s]/g, "");
  const empty = raw === "" || raw === ".";
  const error = !empty && (!/^\d*(\.\d{0,2})?$/.test(raw) || Number(raw) > 1_000_000_000) ? "Enter an amount, for example 110" : "";
  $("g-amount-error").textContent = error;
  const ready = !empty && !error;
  $("g-empty").hidden = ready;
  $("g-result").hidden = !ready;
  if (!ready) return;
  const cents = Math.round(Number(raw) * 100);
  const add = document.querySelector('input[name="g-mode"]:checked')?.value !== "remove";
  const gst = add ? Math.round(cents / 10) : Math.round(cents / 11);
  const ex = add ? cents : cents - gst;
  const inc = add ? cents + gst : cents;
  $("g-label").textContent = add ? "Price including GST" : "Price excluding GST";
  $("g-big").textContent = fmt(add ? inc : ex);
  $("g-rows").innerHTML = [["Price excluding GST", fmt(ex)], ["GST (10%)", fmt(gst)], ["Price including GST", fmt(inc)]]
    .map(([l, v], i) => `<tr${i === 2 ? ' class="total"' : ""}><td>${l}</td><td>${v}</td></tr>`).join("");
}

formatAsYouType($("g-amount"));
$("gst").addEventListener("input", render);
$("gst").addEventListener("change", render);
render();
