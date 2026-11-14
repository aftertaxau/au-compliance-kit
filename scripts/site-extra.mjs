// Extra page families: take-home pay by occupation, the payslip and super checker, and rent vs
// take-home pay by local government area. Every pay figure is calculated with the library.
import { readFileSync } from "node:fs";

const load = (name) => JSON.parse(readFileSync(new URL(`../site/data/${name}`, import.meta.url), "utf8"));

/** @param {any} ctx helpers from build-site.mjs */
export function buildExtraPages(ctx) {
  buildJobPages(ctx);
  buildPayslipChecker(ctx);
  buildRentPages(ctx);
}

// ---------------------------------------------------------------------------------------------
// Take-home pay by occupation
// ---------------------------------------------------------------------------------------------
function buildJobPages(ctx) {
  const { write, layout, esc, fmt, fmt0, payRow, summaryCards, splitBar, yearTaxSection, calculatorForm, adSlot, salaryPageFor, YEAR_LABEL, UPDATED, ASSETS, SUPER_PER_MILLE } = ctx;
  const { meta, occupations } = load("occupations.json");
  const sorted = [...occupations].sort((a, b) => b.medianWeekly - a.medianWeekly);
  const rankOf = new Map(sorted.map((o, i) => [o.code, i]));
  const credit = `<p class="source">Pay data: ${esc(meta.source)}, using the ${esc(meta.earnings.split(":")[0])}. ${esc(meta.licence)}. <a href="${meta.sourceUrl}" rel="nofollow">Source</a>. Take-home figures are our calculations using the ATO's ${YEAR_LABEL} withholding formulas.</p>`;
  const amounts = (weekly) => {
    const w = weekly * 100;
    return { weekly: w, fortnightly: w * 2, monthly: Math.round((w * 52) / 12) };
  };
  // Lower-case an occupation name for use mid-sentence, keeping acronyms and proper nouns.
  const PROPER = new Set(["Aboriginal", "Torres", "Strait", "Islander", "Australian", "Defence", "Force", "ICT", "IT"]);
  const lowerName = (name) => name.split(" ").map((w) => (PROPER.has(w) || /^[A-Z]{2,}$/.test(w) || /\d/.test(w) ? w : w.toLowerCase())).join(" ");
  const pctBelow = (o) => Math.round(((sorted.length - 1 - rankOf.get(o.code)) / (sorted.length - 1)) * 100);

  for (const o of occupations) {
    const a = amounts(o.medianWeekly);
    const rows = [["weekly", "Week"], ["fortnightly", "Fortnight"], ["monthly", "Month"]].map(([p, label]) => ({ label, ...payRow(a[p], p) }));
    const [w, f] = rows;
    const annual = o.medianWeekly * 52;
    const yearTax = w.tax * 52;
    const salaryLink = salaryPageFor(annual);
    const path = `/jobs/${o.slug}/`;
    const lower = lowerName(o.name);
    const title = `${o.name} pay after tax in Australia (${YEAR_LABEL}): take-home pay`;
    const description = `Median full-time pay for ${lower} in Australia is ${fmt0(o.medianWeekly)} a week before tax. After tax that's about ${fmt(w.net)} a week or ${fmt(f.net)} a fortnight in ${YEAR_LABEL}, plus ${fmt(w.superC)} super.`;
    const sameGroup = occupations.filter((x) => x.minor === o.minor && x.code !== o.code);
    const nearPay = sorted.filter((x) => x.code !== o.code && x.major === o.major).sort((x, y) => Math.abs(x.medianWeekly - o.medianWeekly) - Math.abs(y.medianWeekly - o.medianWeekly)).slice(0, 6);
    const related = [...new Map([...sameGroup, ...nearPay].map((x) => [x.code, x])).values()].slice(0, 8);
    const facts = [
      o.employed ? ["People employed", o.employed.toLocaleString("en-AU")] : null,
      o.avgFullTimeHours ? ["Average full-time hours", `${o.avgFullTimeHours} a week`] : null,
      o.fullTimeShare != null ? ["Work full time", `${o.fullTimeShare}%`] : null,
      o.medianHourly ? ["Median full-time hourly pay", fmt0(o.medianHourly)] : null,
      o.femaleShare != null ? ["Women", `${o.femaleShare}%`] : null,
      o.medianAge ? ["Median age", `${o.medianAge}`] : null,
    ].filter(Boolean);
    const hero = `<h1>${esc(o.name)}: pay after tax</h1>
<p class="intro">Median full-time pay for ${esc(lower)} in Australia is <strong>${fmt0(o.medianWeekly)} a week</strong> before tax, about ${fmt0(annual)} a year. After tax withheld that's <strong>${fmt(w.net)}</strong> a week, or ${fmt(f.net)} a fortnight, in ${YEAR_LABEL}.</p>
${summaryCards(rows, annual * 100 - yearTax)}
${splitBar(w.gross, w.tax, w.superC)}
<p class="updated">Median full-time pay (ABS, May 2025). Take-home for ${YEAR_LABEL}, main job, tax-free threshold claimed. Updated ${UPDATED}.</p>`;
    const body = `<h2>Take-home pay by pay period</h2>
<div class="table-scroll"><table><caption>Median full-time pay for ${esc(lower)}, tax-free threshold claimed</caption><thead><tr><th scope="col">Pay period</th><th scope="col">Gross pay</th><th scope="col">Tax withheld</th><th scope="col">Take-home pay</th><th scope="col">Super</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.label}</td><td>${fmt(r.gross)}</td><td>${fmt(r.tax)}</td><td><strong>${fmt(r.net)}</strong></td><td>${fmt(r.superC)}</td></tr>`).join("")}<tr class="total"><td>Year (paid weekly)</td><td>${fmt(annual * 100)}</td><td>${fmt(yearTax)}</td><td>${fmt(annual * 100 - yearTax)}</td><td>${fmt(Math.round((annual * 100 * SUPER_PER_MILLE) / 1000))}</td></tr></tbody></table></div>
<p>That puts ${esc(lower)} above ${pctBelow(o)}% of the ${occupations.length} occupations with published pay${salaryLink ? `. For other amounts near ${fmt0(annual)}, see <a href="/salary/${salaryLink}/">${fmt0(salaryLink)} after tax</a>` : ""}.</p>
${adSlot("job-after-breakdown")}
<h2>About the job</h2>
${o.description ? `<p>${esc(o.description)}</p>` : ""}
<div class="table-scroll"><table><tbody>${facts.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</tbody></table></div>
${o.titles.length ? `<p>Includes: ${o.titles.map(esc).join(", ")}.</p>` : ""}
<h2>Your own pay</h2>
<p>Median pay is the middle of the range: half of full-time workers in the occupation earn more and half earn less. Enter your own pay to see your take-home.</p>
${calculatorForm({ basis: "pay", amount: String(o.medianWeekly), period: "weekly" })}
${yearTaxSection(annual, "weekly")}
<div class="box"><p><strong>A guide, not a pay rate.</strong> These are median earnings for full-time, non-managerial employees paid at the adult rate, including any overtime and before salary sacrifice. Your pay depends on your award or agreement, experience, location and hours. Check minimum rates with the Fair Work Ombudsman.</p></div>
${adSlot("job-end")}
<h2>Similar jobs</h2>
<ul class="links">${related.map((x) => `<li><a href="/jobs/${x.slug}/">${esc(x.name)}</a></li>`).join("")}</ul>
${credit}`;
    const jsonld = [{
      "@context": "https://schema.org", "@type": "Occupation", name: o.name, description: o.description || undefined,
      occupationLocation: { "@type": "Country", name: "Australia" },
      estimatedSalary: { "@type": "MonetaryAmountDistribution", name: "base", currency: "AUD", duration: "P1W", median: o.medianWeekly },
      occupationalCategory: String(o.code),
    }];
    write(path, layout({ path, title, description, hero, body, jsonld, crumbs: [{ name: "Pay by job", path: "/jobs/" }, { name: o.name, path }] }));
  }

  // index
  {
    const path = "/jobs/";
    const groups = [...new Set(occupations.map((o) => o.majorName))];
    const rowFor = (o) => {
      const w = payRow(o.medianWeekly * 100, "weekly");
      return `<tr data-name="${esc(o.name.toLowerCase())} ${esc(o.titles.join(" ").toLowerCase())}"><td><a href="/jobs/${o.slug}/">${esc(o.name)}</a></td><td>${fmt0(o.medianWeekly)}</td><td>${fmt(w.net)}</td><td>${fmt0(Math.round((w.net * 52) / 100))}</td></tr>`;
    };
    const head = `<thead><tr><th scope="col">Occupation</th><th scope="col">Median weekly pay</th><th scope="col">Take-home a week</th><th scope="col">Take-home a year</th></tr></thead>`;
    const top = sorted.slice(0, 10);
    const body = `<h1>Pay after tax by job</h1>
<p class="intro">Median full-time pay and take-home pay for ${occupations.length} occupations in Australia, from nurses and electricians to software programmers and truck drivers. Take-home figures use the ATO's ${YEAR_LABEL} withholding formulas.</p>
<label class="field job-filter"><span>Find a job</span><input id="job-filter" type="search" placeholder="e.g. nurse, electrician, teacher" autocomplete="off"></label>
<p class="note" id="job-count"></p>
${adSlot("jobs-index")}
<h2 id="job-top-h">Highest median pay</h2>
<div class="table-scroll" id="job-top"><table>${head}<tbody>${top.map(rowFor).join("")}</tbody></table></div>
${groups.map((g) => `<h2 class="job-group">${esc(g)}</h2><div class="table-scroll job-wrap"><table>${head}<tbody>${occupations.filter((o) => o.majorName === g).sort((x, y) => x.name.localeCompare(y.name)).map(rowFor).join("")}</tbody></table></div>`).join("\n")}
${credit}
<script type="module" src="${ASSETS}/jobs.js"></script>`;
    write(path, layout({ path, title: `Pay after tax by job in Australia (${YEAR_LABEL}): ${occupations.length} occupations`, description: `Median full-time pay and take-home pay for ${occupations.length} Australian occupations, including nurses, electricians, teachers and software programmers, using ${YEAR_LABEL} tax rates.`, body, crumbs: [{ name: "Pay by job", path }] }));
  }
}

// ---------------------------------------------------------------------------------------------
// Payslip and super checker
// ---------------------------------------------------------------------------------------------
function buildPayslipChecker(ctx) {
  const { write, layout, esc, segmented, tip, HELP, adSlot, ASSETS, YEAR_LABEL } = ctx;
  Object.assign(HELP, {
    "p-gross": "Your total taxable pay for this pay period before tax: wages, overtime, taxable allowances and bonuses paid in this pay. Use the amount after any salary sacrifice.",
    "p-overtime": "Overtime included in the gross pay. Super isn't usually paid on overtime, so it's left out of the super check.",
    "p-tax": "The tax (PAYG withholding) shown on your payslip for this pay.",
    "p-super": "The super contribution shown on your payslip for this pay (employer super guarantee only, not salary sacrifice).",
    "p-date": "The date you were paid. It picks the right year's tax tables and works out when your super is due.",
  });
  const money = (id, label, placeholder, help = true) => `<label class="field"><span>${label}${help ? tip(id) : ""}</span>
<span class="money-input small"><span aria-hidden="true">$</span><input id="${id}" inputmode="decimal" autocomplete="off" placeholder="${placeholder}" aria-describedby="${id}-error"></span>
<span class="error" id="${id}-error" role="alert"></span></label>`;
  const form = `<form class="calc" id="payslip" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
${segmented("p-period", "Pay period", [["weekly", "Weekly"], ["fortnightly", "Fortnightly"], ["monthly", "Monthly"]], "fortnightly", true, "period")}
<label class="field wide"><span>Pay date${tip("p-date")}</span><input id="p-date" type="date"></label>
${money("p-gross", "Gross pay this period", "3,076.92")}
${money("p-overtime", "Of which overtime", "0")}
${money("p-tax", "Tax withheld on payslip", "622")}
${money("p-super", "Super on payslip", "369.23")}
</div>
<h2 class="form-section">Your tax details</h2>
<div class="calc-grid">
${segmented("p-tft", "Tax-free threshold", [["yes", "Claiming"], ["no", "Not claiming"]], "yes", false, "tft")}
${segmented("p-help", "HELP or study loan", [["no", "No"], ["yes", "Yes"]], "no", false, "r-help")}
${segmented("p-residency", "Residency for tax", [["resident", "Resident"], ["foreign", "Foreign"]], "resident", false, "residency")}
${segmented("p-tfn", "TFN given to employer", [["yes", "Yes"], ["no", "No"]], "yes", false, "tfn")}
</div>
</div>
<div class="calc-result" aria-live="polite">
<div id="p-empty"><p class="kicker">Payslip check</p><p class="big muted">–</p><p class="sub">Enter your gross pay and the tax on your payslip to check them against the ATO's formulas.</p></div>
<div id="p-result" hidden>
<p class="kicker" id="p-label"></p>
<p class="big" id="p-big"></p>
<div class="table-scroll"><table class="compact"><tbody id="p-rows"></tbody></table></div>
<p class="note" id="p-note"></p>
</div></div>
<noscript><p class="note">The checker needs JavaScript.</p></noscript>
</form>
<script type="module" src="${ASSETS}/payslip.js"></script>
<script type="module" src="${ASSETS}/tips.js"></script>`;
  const path = "/payslip-checker/";
  const hero = `<h1>Payslip and super checker</h1>
<p class="intro">Is your employer taking out the right tax and paying the right super? Enter the figures from your payslip and we'll check them against the ATO's withholding formulas and the 12% super guarantee.</p>
${form}`;
  const body = `${adSlot("payslip-below-calc")}
<h2>How the check works</h2>
<ul>
<li><strong>Tax:</strong> we work out the tax your employer should withhold from your gross pay using the ATO's PAYG withholding formulas for the pay date (Schedule 1, with Schedule 8 if you have a study loan). Our calculations match every row of the ATO's sample data, so a difference of more than a dollar or two is worth asking about.</li>
<li><strong>Super:</strong> 12% of your ordinary time earnings, which is your gross pay less overtime. Some allowances and bonuses are treated differently, so small differences can be legitimate.</li>
<li><strong>When super is due:</strong> since 1 July 2026, under Payday Super, your employer's super contribution must reach your fund within 7 business days of payday. For a new employee the first contribution can take up to 20 business days.</li>
</ul>
<h2>Why the tax might not match</h2>
<ul>
<li>You claimed the tax-free threshold with another employer, or not with this one.</li>
<li>You asked your employer to withhold extra (an upwards variation), or you have a withholding variation from the ATO.</li>
<li>Your gross pay includes amounts taxed differently, such as back pay, a bonus taxed under Method A, or a termination payment.</li>
<li>You have a HELP or other study loan, a Medicare levy exemption or a family variation that your employer knows about.</li>
<li>Salary sacrifice: use your gross pay after salary sacrifice.</li>
</ul>
<h2>If something looks wrong</h2>
<ol>
<li>Ask your payroll team first. Most errors are a wrong tax-file-number declaration or a missed setting.</li>
<li>Check your super has arrived in your fund's app or in myGov.</li>
<li>For unpaid or underpaid wages, contact the <a href="https://www.fairwork.gov.au/" rel="nofollow">Fair Work Ombudsman</a>. For unpaid super, you can lodge an unpaid super enquiry with the ATO through myGov.</li>
</ol>
<div class="box"><p><strong>General information.</strong> This tool checks the standard calculations only and can't see everything about your pay, such as allowances, salary packaging or a withholding variation. It isn't legal or tax advice.</p></div>
<p>Related: <a href="/guides/payday-super/">Payday Super</a>, <a href="/guides/how-tax-withheld-works/">how tax withheld works</a>, <a href="/guides/why-do-i-owe-tax/">why you might owe tax</a>.</p>
${adSlot("payslip-end")}`;
  write(path, layout({ path, title: `Payslip checker: is my tax and super right? (${YEAR_LABEL})`, description: "Check the tax withheld and super on your Australian payslip against the ATO's withholding formulas and the 12% super guarantee, and see when your super must arrive under Payday Super.", hero, body, crumbs: [{ name: "Payslip checker", path }] }));
}

// ---------------------------------------------------------------------------------------------
// Rent vs take-home pay
// ---------------------------------------------------------------------------------------------
function buildRentPages(ctx) {
  const { write, layout, esc, fmt, fmt0, payRow, adSlot, ASSETS, YEAR_LABEL, UPDATED } = ctx;
  const { meta, areas } = load("rents.json");
  const STATE = { NSW: "nsw", VIC: "vic" };
  const TYPES = [["all", "All homes"], ["unit1", "1-bedroom unit"], ["unit2", "2-bedroom unit"], ["house3", "3-bedroom house"]];
  const SALARIES = [60000, 80000, 100000, 120000];
  const weeklyNet = (salary) => payRow(Math.round((salary * 100) / 52), "weekly").net;
  const share = (rent, salary) => Math.round(((rent * 100) / weeklyNet(salary)) * 100);
  const needed = (rent) => Math.ceil((rent * 52) / 0.3 / 1000) * 1000;
  const credit = (states) => `<p class="source">Rent data: ${states.map((s) => `${esc(meta.sources[s].name)}, ${esc(meta.sources[s].licence)} (<a href="${meta.sources[s].url}" rel="nofollow">source</a>)`).join("; ")}. Median weekly rent for new leases. Take-home pay is our calculation with the ATO's ${YEAR_LABEL} withholding formulas.</p>`;
  const areaPath = (a) => `/rent/${STATE[a.state]}/${a.slug}/`;
  const dataJson = JSON.stringify(areas.map((a) => ({ s: a.state, n: a.name, p: areaPath(a), a: a.all, u1: a.unit1, u2: a.unit2, h3: a.house3 })));

  const tool = (selected) => `<form class="calc" id="rent" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
<label class="field wide"><span>Area</span><select id="r-area">${["NSW", "VIC"].map((s) => `<optgroup label="${s === "NSW" ? "New South Wales" : "Victoria"}">${areas.filter((a) => a.state === s).sort((x, y) => x.name.localeCompare(y.name)).map((a) => `<option value="${esc(areaPath(a))}"${selected && areaPath(selected) === areaPath(a) ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</optgroup>`).join("")}</select></label>
<label class="field wide"><span>Your salary before tax (a year)</span>
<span class="money-input"><span aria-hidden="true">$</span><input id="r-salary-in" inputmode="decimal" autocomplete="off" placeholder="85,000" value="85,000"></span></label>
<label class="field wide"><span>Partner's salary, if you rent together</span>
<span class="money-input small"><span aria-hidden="true">$</span><input id="r-partner" inputmode="decimal" autocomplete="off" placeholder="0"></span></label>
</div>
</div>
<div class="calc-result" aria-live="polite">
<p class="kicker" id="rent-label">Median rent as a share of take-home pay</p>
<p class="big" id="rent-big">–</p>
<div class="table-scroll"><table class="compact"><thead><tr><th scope="col">Home</th><th scope="col">Rent a week</th><th scope="col">Of take-home</th></tr></thead><tbody id="rent-rows"></tbody></table></div>
<p class="note" id="rent-note"></p>
</div>
<script type="application/json" id="rent-data">${dataJson.replace(/</g, "\\u003c")}</script>
</form>
<script type="module" src="${ASSETS}/rent.js"></script>`;

  for (const a of areas) {
    const path = areaPath(a);
    const typeRows = TYPES.filter(([k]) => a[k]).map(([k, label]) => `<tr><td>${label}</td><td>${fmt0(a[k])}</td>${SALARIES.slice(0, 3).map((s) => `<td>${share(a[k], s)}%</td>`).join("")}<td>${fmt0(needed(a[k]))}</td></tr>`).join("");
    const neighbours = areas.filter((x) => x.state === a.state && x.region === a.region && x.slug !== a.slug).sort((x, y) => Math.abs(x.all - a.all) - Math.abs(y.all - a.all)).slice(0, 10);
    const cheaper = neighbours.filter((x) => x.all < a.all).slice(0, 3);
    const s80 = share(a.all, 80000);
    const hero = `<h1>Rent in ${esc(a.name)} vs take-home pay</h1>
<p class="intro">The median rent for a new lease in ${esc(a.name)} (${esc(a.state)}) was <strong>${fmt0(a.all)} a week</strong> in the ${esc(meta.quarter)}. On an $80,000 salary you take home ${fmt(weeklyNet(80000))} a week, so that rent would take <strong>${s80}%</strong> of your pay.</p>
${tool(a)}`;
    const body = `<h2>What each type of home costs</h2>
<div class="table-scroll"><table><caption>Median weekly rent for new leases, ${esc(meta.quarter)}, as a share of take-home pay (single income)</caption><thead><tr><th scope="col">Home</th><th scope="col">Median rent</th>${SALARIES.slice(0, 3).map((s) => `<th scope="col">On ${fmt0(s / 1000)}k</th>`).join("")}<th scope="col">Salary for rent under 30% of pay</th></tr></thead><tbody>${typeRows}</tbody></table></div>
<p>A common guide is that rent above 30% of your gross income is "rental stress". In ${esc(a.name)}, keeping the median rent under that line takes a salary of about ${fmt0(needed(a.all))}, or a combined household income of that much if you rent with someone.</p>
${adSlot("rent-mid")}
${neighbours.length ? `<h2>Nearby areas in ${esc(a.region)}</h2>
<div class="table-scroll"><table><thead><tr><th scope="col">Area</th><th scope="col">Median rent</th><th scope="col">On $80k</th></tr></thead><tbody>${neighbours.map((x) => `<tr><td><a href="${areaPath(x)}">${esc(x.name)}</a></td><td>${fmt0(x.all)}</td><td>${share(x.all, 80000)}%</td></tr>`).join("")}</tbody></table></div>` : ""}
${cheaper.length ? `<p>Cheaper nearby: ${cheaper.map((x) => `<a href="${areaPath(x)}">${esc(x.name)}</a> (${fmt0(x.all)})`).join(", ")}.</p>` : ""}
${a.newLeases ? `<p>Based on ${a.newLeases.toLocaleString("en-AU")} new leases in ${esc(a.name)} in the ${esc(meta.quarter)}.</p>` : ""}
<p>See your full take-home pay with the <a href="/">pay calculator</a>, or compare <a href="/rent/">rents across ${a.state === "NSW" ? "NSW and Victoria" : "Victoria and NSW"}</a>.</p>
${credit([a.state])}`;
    write(path, layout({ path, title: `Rent in ${a.name} (${a.state}) vs take-home pay: ${fmt0(a.all)} a week`, description: `Median rent in ${a.name} is ${fmt0(a.all)} a week (${meta.quarter}): ${s80}% of take-home pay on an $80,000 salary. Rents by home type and the salary needed to keep rent under 30%.`, hero, body, crumbs: [{ name: "Rent vs pay", path: "/rent/" }, { name: `${a.name} (${a.state})`, path }] }));
  }

  // index
  {
    const path = "/rent/";
    const table = (state) => `<div class="table-scroll"><table><thead><tr><th scope="col">Area</th><th scope="col">Region</th><th scope="col">Median rent</th><th scope="col">On $80k</th></tr></thead><tbody>${areas.filter((a) => a.state === state).sort((x, y) => y.all - x.all).map((a) => `<tr><td><a href="${areaPath(a)}">${esc(a.name)}</a></td><td>${esc(a.region)}</td><td>${fmt0(a.all)}</td><td>${share(a.all, 80000)}%</td></tr>`).join("")}</tbody></table></div>`;
    const hero = `<h1>Rent vs take-home pay: can you afford it?</h1>
<p class="intro">Compare the median rent in ${areas.length} areas of New South Wales and Victoria with your take-home pay. Rents are for new leases in the ${esc(meta.quarter)}; take-home pay uses the ATO's ${YEAR_LABEL} formulas.</p>
${tool(areas.find((a) => a.name === "Parramatta") || areas[0])}`;
    const body = `${adSlot("rent-index")}
<h2>New South Wales</h2>
${table("NSW")}
<h2>Victoria</h2>
${table("VIC")}
<p class="updated">Updated ${UPDATED}. Medians for areas with too few new leases aren't published.</p>
${credit(["NSW", "VIC"])}`;
    write(path, layout({ path, title: `Rent vs take-home pay calculator: NSW and Victoria (${meta.quarter})`, description: `How much of your take-home pay would rent take? Median rents for ${areas.length} areas in NSW and Victoria compared with take-home pay, using official ${meta.quarter} data.`, hero, body, crumbs: [{ name: "Rent vs pay", path }] }));
  }
}
