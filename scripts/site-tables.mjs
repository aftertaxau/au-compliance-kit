// Tax tables: tax withheld from weekly, fortnightly and monthly pay, laid out like the ATO's tables
// but calculated with the library (Schedule 1 formulas), plus a lookup for any amount.

const KINDS = {
  weekly: { label: "Weekly", word: "week", from: 100, to: 3000, step: 10, page: (a) => a >= 300 && a <= 3000 && a % 50 === 0 },
  fortnightly: { label: "Fortnightly", word: "fortnight", from: 200, to: 6000, step: 20, page: (a) => a >= 1000 && a <= 6000 && a % 100 === 0 },
  monthly: { label: "Monthly", word: "month", from: 400, to: 13000, step: 50, page: () => false },
};
const COMPARE = { weekly: [500, 800, 1000, 1500, 2000, 3000], fortnightly: [1000, 1600, 2000, 3000, 4000, 6000], monthly: [2000, 3500, 4500, 6500, 8500, 13000] };

export function buildTaxTables({ write, layout, esc, fmt0, calculateWithholding, segmented, adSlot, ASSETS, YEAR_LABEL, UPDATED }) {
  const wh = (earnings, period, opts = {}) => calculateWithholding({ earnings, period, taxYear: "2026-27", ...opts }).withholding;

  for (const [kind, K] of Object.entries(KINDS)) {
    const path = `/${kind}-tax-table/`;
    const others = Object.keys(KINDS).filter((k) => k !== kind);
    const amounts = [];
    for (let a = K.from; a <= K.to; a += K.step) amounts.push(a);
    const rows = amounts.map((a) => {
      const cell = K.page(a) ? `<a href="/${kind}/${a}/">${fmt0(a)}</a>` : fmt0(a);
      return `<tr><td>${cell}</td><td>${fmt0(wh(a, kind))}</td><td>${fmt0(wh(a, kind, { taxFreeThreshold: false }))}</td></tr>`;
    }).join("");
    const compare = COMPARE[kind].map((a) => {
      const before = calculateWithholding({ earnings: a, period: kind, taxYear: "2025-26" }).withholding;
      const now = wh(a, kind);
      return `<tr><td>${fmt0(a)}</td><td>${fmt0(before)}</td><td>${fmt0(now)}</td><td>${now <= before ? `${fmt0(before - now)} less` : `${fmt0(now - before)} more`}</td></tr>`;
    }).join("");
    const exampleAmount = COMPARE[kind][2];

    const form = `<form class="calc" id="taxtable" data-period="${kind}" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
<label class="field wide"><span>Gross pay a ${K.word}</span>
<span class="money-input"><span aria-hidden="true">$</span><input id="t-amount" inputmode="decimal" autocomplete="off" placeholder="${exampleAmount.toLocaleString("en-AU")}" aria-describedby="t-amount-error"></span>
<span class="error" id="t-amount-error" role="alert"></span></label>
${segmented("t-tft", "Tax-free threshold claimed", [["yes", "Yes (main job)"], ["no", "No (second job)"]], "yes", true, "none")}
${segmented("t-loan", "HECS-HELP or other study loan", [["no", "No"], ["yes", "Yes"]], "no", true, "none")}
</div>
</div>
<div class="calc-result" aria-live="polite">
<div id="t-empty"><p class="kicker">Tax withheld a ${K.word}</p><p class="big muted">$0</p><p class="sub">Enter your gross ${kind} pay to see the exact amount.</p></div>
<div id="t-result" hidden>
<p class="kicker">Tax withheld a ${K.word}</p>
<p class="big" id="t-big"></p>
<div class="table-scroll"><table class="compact"><tbody id="t-rows"></tbody></table></div>
<p class="sub"><a href="/">Full breakdown with super in the pay calculator</a></p>
</div></div>
<noscript><p class="note">The lookup needs JavaScript. The table below lists the tax withheld for every ${fmt0(K.step)} step.</p></noscript>
</form>
<script type="module" src="${ASSETS}/taxtable.js"></script>`;

    const hero = `<h1>${K.label} tax table ${YEAR_LABEL}</h1>
<p class="intro">Tax withheld from ${kind} pay under the ATO's ${YEAR_LABEL} withholding formulas, for pay from 1 July 2026. Enter your ${kind} pay for the exact amount, or find it in the table below.</p>
${form}`;

    const body = `${adSlot(`${kind}-table-below-calc`)}
<h2>How to read the table</h2>
<ul>
<li><strong>${K.label} earnings</strong> are your gross pay for the ${K.word} before tax, including taxable allowances and overtime.</li>
<li><strong>With tax-free threshold</strong> is for the job where you claimed the threshold on your Tax file number declaration, usually your main or only job.</li>
<li><strong>No tax-free threshold</strong> is for a second job or any other job where you didn't claim it. See <a href="/guides/second-job-tax/">tax on a second job</a>.</li>
<li>Cents are dropped before the formulas are applied, as on the ATO's tables, so ${fmt0(exampleAmount)} and ${fmt0(exampleAmount)}.99 have the same tax withheld.</li>
</ul>
<p>The table doesn't cover study loans (use the lookup above), seniors and pensioners (<a href="/guides/seniors-tax-offset/">a separate table applies</a>), foreign residents, working holiday makers or anyone who hasn't given their tax file number, who has 47% withheld.</p>
<h2>${K.label} tax table ${YEAR_LABEL}</h2>
<div class="table-scroll"><table><thead><tr><th scope="col">${K.label} earnings</th><th scope="col">With tax-free threshold</th><th scope="col">No tax-free threshold</th></tr></thead><tbody>${rows}</tbody></table></div>
<p class="note">Steps of ${fmt0(K.step)} from ${fmt0(K.from)} to ${fmt0(K.to)}. For amounts in between or above, use the lookup at the top of the page.</p>
${adSlot(`${kind}-table-mid`)}
<h2>What changed from 2025–26</h2>
<p>From 1 July 2026 the first tax rate fell from 16% to 15%, so the same pay has less tax withheld. Claiming the tax-free threshold:</p>
<div class="table-scroll"><table><thead><tr><th scope="col">${K.label} earnings</th><th scope="col">2025–26</th><th scope="col">${YEAR_LABEL}</th><th scope="col">Difference</th></tr></thead><tbody>${compare}</tbody></table></div>
<p>See <a href="/guides/tax-changes-2026-27/">what changed from 1 July 2026</a>.</p>
<h2>Other pay periods</h2>
<p class="more">${others.map((k) => `<a href="/${k}-tax-table/">${KINDS[k].label} tax table</a>`).join("")}<a href="/${kind === "monthly" ? "salary" : kind}/">${kind === "monthly" ? "Salaries after tax" : `${K.label} pay after tax`}</a><a href="/guides/pay-frequency-and-tax/">Does pay frequency change your tax?</a></p>
<h2>Where the figures come from</h2>
<p>The amounts follow the ATO's <em>Schedule 1 – Statement of formulas for calculating amounts to be withheld</em> (NAT 1004) for ${YEAR_LABEL}, the same formulas payroll software uses. Our calculator is tested against all 432 of the ATO's sample rows for the year. <a href="/about/">How we calculate</a>. Updated ${UPDATED}.</p>
${adSlot(`${kind}-table-end`)}`;

    write(path, layout({
      path,
      title: `${K.label} tax table ${YEAR_LABEL}: tax withheld from ${kind} pay`,
      description: `The ${kind} tax table for ${YEAR_LABEL}: tax withheld from ${kind} pay of ${fmt0(K.from)} to ${fmt0(K.to)}, with and without the tax-free threshold, from the ATO's formulas. Look up any amount.`,
      hero, body, crumbs: [{ name: "Tax tables", path: "/tax-tables/" }, { name: `${K.label} tax table`, path }],
    }));
  }

  {
    const path = "/tax-tables/";
    const sample = [[1000, 2000, 4333], [1500, 3000, 6500], [2000, 4000, 8667]].map(([w, f, m]) =>
      `<tr><td>${fmt0(w * 52)} a year</td><td>${fmt0(wh(w, "weekly"))} on ${fmt0(w)}</td><td>${fmt0(wh(f, "fortnightly"))} on ${fmt0(f)}</td><td>${fmt0(wh(m, "monthly"))} on ${fmt0(m)}</td></tr>`).join("");
    const body = `<h1>Tax tables ${YEAR_LABEL}</h1>
<p class="intro">How much tax is withheld from your pay in ${YEAR_LABEL}, by how often you're paid. Each table follows the ATO's withholding formulas and has a lookup for any amount.</p>
<ul class="cards">${Object.entries(KINDS).map(([kind, K]) => `<li><a href="/${kind}-tax-table/">${K.label} tax table</a><p>Tax withheld from ${kind} pay of ${fmt0(K.from)} to ${fmt0(K.to)}, with and without the tax-free threshold.</p></li>`).join("")}</ul>
<h2>The same salary paid three ways</h2>
<p>Tax withheld each pay for a few salaries, claiming the tax-free threshold. Over a year the totals are almost the same.</p>
<div class="table-scroll"><table><thead><tr><th scope="col">Salary</th><th scope="col">Weekly</th><th scope="col">Fortnightly</th><th scope="col">Monthly</th></tr></thead><tbody>${sample}</tbody></table></div>
<p>For tax for the whole year rather than per pay, see the <a href="/tax-rates/">tax rates for ${YEAR_LABEL}</a> or the <a href="/tax-refund-calculator/">tax refund calculator</a>.</p>`;
    write(path, layout({ path, title: `Tax tables ${YEAR_LABEL}: weekly, fortnightly and monthly tax withheld`, description: `Weekly, fortnightly and monthly tax tables for ${YEAR_LABEL}: tax withheld from your pay with and without the tax-free threshold, from the ATO's formulas.`, body, crumbs: [{ name: "Tax tables", path }] }));
  }
}
