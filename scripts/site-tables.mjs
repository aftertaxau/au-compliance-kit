// Tax tables: tax withheld from weekly, fortnightly and monthly pay, laid out like the ATO's tables
// but calculated with the library (Schedule 1 formulas), plus a lookup for any amount.

const KINDS = {
  weekly: { label: "Weekly", word: "week", from: 100, to: 3000, step: 10, page: (a) => a >= 300 && a <= 3000 && a % 50 === 0 },
  fortnightly: { label: "Fortnightly", word: "fortnight", from: 200, to: 6000, step: 20, page: (a) => a >= 1000 && a <= 6000 && a % 100 === 0 },
  monthly: { label: "Monthly", word: "month", from: 400, to: 13000, step: 50, page: () => false },
};
const COMPARE = { weekly: [500, 800, 1000, 1500, 2000, 3000], fortnightly: [1000, 1600, 2000, 3000, 4000, 6000], monthly: [2000, 3500, 4500, 6500, 8500, 13000] };

const PERIODS = [["weekly", "Weekly"], ["fortnightly", "Fortnightly"], ["monthly", "Monthly"]];
const WORD = { weekly: "week", fortnightly: "fortnight", monthly: "month" };
const SENIOR_STATUS = [["single", "Single"], ["couple", "Couple (each)"], ["illness-separated", "Separated by illness (each)"]];

export function buildTaxTables({ write, layout, esc, fmt0, calculateWithholding, estimateAnnualTax, segmented, adSlot, ASSETS, YEAR_LABEL, UPDATED }) {
  const wh = (earnings, period, opts = {}) => calculateWithholding({ earnings, period, taxYear: "2026-27", ...opts }).withholding;
  // Highest whole-dollar pay with nothing withheld.
  const nilUpTo = (period, opts) => { let a = 0; while (wh(a + 1, period, opts) === 0) a++; return a; };
  const amounts = (from, to, step) => { const out = []; for (let a = from; a <= to; a += step) out.push(a); return out; };
  const tableHtml = (head, rows) => `<div class="table-scroll"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const money = (name, label, placeholder, prefix) => `<label class="field wide"><span>${label}</span>
<span class="money-input"><span aria-hidden="true">$</span><input id="${prefix}-${name}" inputmode="decimal" autocomplete="off" placeholder="${placeholder}" aria-describedby="${prefix}-${name}-error"></span>
<span class="error" id="${prefix}-${name}-error" role="alert"></span></label>`;

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
<li><strong>No tax-free threshold</strong> is for a second job or any other job where you didn't claim it. See the <a href="/second-job-tax-table/">second job tax table</a>.</li>
<li>Cents are dropped before the formulas are applied, as on the ATO's tables, so ${fmt0(exampleAmount)} and ${fmt0(exampleAmount)}.99 have the same tax withheld.</li>
</ul>
<p>The table doesn't cover study loans (use the lookup above), seniors and pensioners who claim the seniors offset (see the <a href="/seniors-tax-table/">seniors and pensioners tax table</a>), foreign residents, working holiday makers or anyone who hasn't given their tax file number, who has 47% withheld.</p>
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

  // ---------- seniors and pensioners tax table (Schedule 9) ----------
  {
    const path = "/seniors-tax-table/";
    const single = { seniors: "single" };
    const nil = SENIOR_STATUS.map(([st, label]) => [label, ...PERIODS.map(([p]) => fmt0(nilUpTo(p, { seniors: st })))]);
    nil.push(["Not claiming the seniors offset", ...PERIODS.map(([p]) => fmt0(nilUpTo(p)))]);
    const grid = (period, from, to, step) => tableHtml(
      [`${PERIODS.find(([p]) => p === period)[1]} earnings`, ...SENIOR_STATUS.map(([, l]) => l), "Not claiming the offset"],
      amounts(from, to, step).map((a) => [fmt0(a), ...SENIOR_STATUS.map(([st]) => fmt0(wh(a, period, { seniors: st }))), fmt0(wh(a, period))]));
    const compare = [700, 800, 1000, 1200, 1500].map((a) => {
      const before = calculateWithholding({ earnings: a, period: "weekly", taxYear: "2025-26", seniors: "single" }).withholding;
      const now = wh(a, "weekly", single);
      return [fmt0(a), fmt0(before), fmt0(now), now <= before ? `${fmt0(before - now)} less` : `${fmt0(now - before)} more`];
    });
    const ex = 1200;
    const form = `<form class="calc" id="taxtable" data-period="fortnightly" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
${money("amount", "Gross pay each pay", "1,200", "t")}
${segmented("t-period", "Paid", PERIODS.map(([p, l]) => [p, l]), "fortnightly", true, "none")}
${segmented("t-status", "Your situation", [["single", "Single"], ["couple", "Couple"], ["illness-separated", "Separated by illness"]], "single", true, "none")}
${segmented("t-loan", "HECS-HELP or other study loan", [["no", "No"], ["yes", "Yes"]], "no", true, "none")}
</div>
</div>
<div class="calc-result" aria-live="polite">
<div id="t-empty"><p class="kicker">Tax withheld each pay</p><p class="big muted">$0</p><p class="sub">Enter your gross pay to see the amount under the seniors table.</p></div>
<div id="t-result" hidden>
<p class="kicker">Tax withheld each pay</p>
<p class="big" id="t-big"></p>
<div class="table-scroll"><table class="compact"><tbody id="t-rows"></tbody></table></div>
<p class="sub"><a href="/guides/seniors-tax-offset/">Check your tax for the whole year</a></p>
</div></div>
<noscript><p class="note">The lookup needs JavaScript. The tables below list the tax withheld for each step.</p></noscript>
</form>
<script type="module" src="${ASSETS}/taxtable.js"></script>`;

    const hero = `<h1>Seniors and pensioners tax table ${YEAR_LABEL}</h1>
<p class="intro">Tax withheld from the pay of seniors and pensioners who claim the seniors and pensioners tax offset (SAPTO), under the ATO's ${YEAR_LABEL} formulas. A single senior has nothing withheld on pay up to ${fmt0(nilUpTo("weekly", single))} a week or ${fmt0(nilUpTo("fortnightly", single))} a fortnight.</p>
${form}`;

    const body = `${adSlot("seniors-table-below-calc")}
<h2>Who this table is for</h2>
<p>Your employer uses the seniors table when you claim the seniors and pensioners tax offset on a withholding declaration (the ATO has a short version for seniors and pensioners). It withholds less than the regular table because the offset will cut your tax for the year. If you haven't claimed it, the <a href="/weekly-tax-table/">regular tax tables</a> apply.</p>
<p>It covers pay from work. Tax isn't taken out of the Age Pension unless you ask Services Australia to. See <a href="/guides/working-on-the-age-pension/">working part-time on the Age Pension</a> for how the two add up.</p>
<h2>Pay with nothing withheld</h2>
<p>The highest whole-dollar pay with no tax withheld in ${YEAR_LABEL}:</p>
${tableHtml(["", ...PERIODS.map(([, l]) => l)], nil)}
<h2>Weekly seniors tax table ${YEAR_LABEL}</h2>
${grid("weekly", 500, 2000, 10)}
<p class="note">Steps of $10 from $500 to $2,000. Couples' amounts are for each partner.</p>
${adSlot("seniors-table-mid")}
<h2>Fortnightly seniors tax table ${YEAR_LABEL}</h2>
${grid("fortnightly", 1000, 4000, 20)}
<p class="note">Steps of $20 from $1,000 to $4,000. For monthly pay or any other amount, use the lookup at the top of the page.</p>
<h2>What changed from 2025–26</h2>
<p>The first tax rate fell from 16% to 15% on 1 July 2026, so the seniors table withholds less on most pay. For a single senior, weekly:</p>
${tableHtml(["Weekly earnings", "2025–26", YEAR_LABEL, "Difference"], compare)}
<h2>Where the figures come from</h2>
<p>The amounts follow the ATO's <em>Schedule 9 – Tax table for seniors and pensioners</em> for ${YEAR_LABEL} (legislative instrument LI 2026/18), and are checked against the ATO's worked example. The table doesn't cover Medicare levy exemptions or extra offsets claimed on a withholding declaration. Updated ${UPDATED}.</p>
<p class="more"><a href="/guides/seniors-tax-offset/">Seniors tax offset and calculator</a><a href="/guides/working-on-the-age-pension/">Working on the Age Pension</a><a href="/tax-tables/">All tax tables</a></p>
${adSlot("seniors-table-end")}`;

    write(path, layout({
      path,
      title: `Seniors and pensioners tax table ${YEAR_LABEL}: weekly and fortnightly`,
      description: `Tax withheld from seniors' and pensioners' pay in ${YEAR_LABEL} under the ATO's seniors table: nothing withheld up to ${fmt0(nilUpTo("weekly", single))} a week for singles. Weekly and fortnightly tables for singles and couples, with a lookup.`,
      hero, body, crumbs: [{ name: "Tax tables", path: "/tax-tables/" }, { name: "Seniors and pensioners tax table", path }],
    }));
  }

  // ---------- second job tax table (no tax-free threshold) ----------
  {
    const path = "/second-job-tax-table/";
    const grid = (period, from, to, step) => tableHtml(
      [`${PERIODS.find(([p]) => p === period)[1]} pay from the second job`, "Withheld (no tax-free threshold)", "If it were your main job", "Extra withheld"],
      amounts(from, to, step).map((a) => { const no = wh(a, period, { taxFreeThreshold: false }), yes = wh(a, period); return [fmt0(a), fmt0(no), fmt0(yes), fmt0(no - yes)]; }));
    // Worked example: a main job and a smaller second job, both weekly.
    const [m, sj] = [1200, 400];
    const w1 = wh(m, "weekly"), w2 = wh(sj, "weekly", { taxFreeThreshold: false });
    const yearTax = Math.round(estimateAnnualTax({ salary: (m + sj) * 52, taxYear: "2026-27", payFrequency: "weekly" }).cents.totalLiability / 100);
    const yearWithheld = (w1 + w2) * 52;
    const gap = yearWithheld - yearTax;
    const form = `<form class="calc" id="secondjob" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
${segmented("j-period", "Both jobs pay", PERIODS.map(([p, l]) => [p, l]), "weekly", true, "none")}
${money("main", "Main job pay before tax, each pay", "1,200", "j")}
${money("second", "Second job pay before tax, each pay", "400", "j")}
${segmented("j-loan", "HECS-HELP or other study loan", [["no", "No"], ["yes", "Yes"]], "no", true, "none")}
</div>
</div>
<div class="calc-result" aria-live="polite">
<div id="j-empty"><p class="kicker">At tax time</p><p class="big muted">$0</p><p class="sub">Enter the pay from both jobs to see whether enough tax is withheld.</p></div>
<div id="j-result" hidden>
<p class="kicker">At tax time</p>
<p class="big" id="j-big"></p>
<p class="sub" id="j-sub"></p>
<div class="table-scroll"><table class="compact"><tbody id="j-rows"></tbody></table></div>
</div></div>
<noscript><p class="note">The calculator needs JavaScript. The tables below list the tax withheld from a second job.</p></noscript>
</form>
<script type="module" src="${ASSETS}/secondjob.js"></script>`;

    const hero = `<h1>Second job tax table ${YEAR_LABEL}</h1>
<p class="intro">Tax withheld from a second job, where you don't claim the tax-free threshold, under the ATO's ${YEAR_LABEL} formulas. Enter the pay from both jobs to see whether enough is withheld for the year.</p>
${form}
<p class="note">Assumes both jobs last the full year at this pay, the $1,000 standard deduction for work expenses, no other income or deductions, and no Medicare levy surcharge.</p>`;

    const body = `${adSlot("second-job-below-calc")}
<h2>Why more comes out of a second job</h2>
<p>You claim the tax-free threshold from one employer only, usually the one that pays more. Your second employer withholds as if every dollar is taxable: ${fmt0(wh(300, "weekly", { taxFreeThreshold: false }))} on ${fmt0(300)} a week, where a main job would withhold ${fmt0(wh(300, "weekly"))}. It isn't extra tax. Across both jobs it usually adds up to about the right amount, and any overpayment comes back when you lodge your tax return.</p>
<h2>Example: ${fmt0(m)} a week plus ${fmt0(sj)} a week</h2>
${tableHtml(["", "Each week", "Over the year"], [
  ["Withheld from the main job", fmt0(w1), fmt0(w1 * 52)],
  ["Withheld from the second job", fmt0(w2), fmt0(w2 * 52)],
  [`Tax for the year on ${fmt0((m + sj) * 52)}`, "", fmt0(yearTax)],
  [gap >= 0 ? "Refund at tax time" : "Owing at tax time", "", fmt0(Math.abs(gap))],
])}
<p>${gap >= 0 ? "Here enough is withheld" : "Here too little is withheld"}. When the two jobs together push you into a higher tax bracket, the second job's withholding can fall short, because each employer only knows about its own pay. If that's you, ask your second employer to withhold more.</p>
<h2>Weekly second job tax table ${YEAR_LABEL}</h2>
${grid("weekly", 50, 1500, 10)}
<p class="note">Steps of $10 from $50 to $1,500.</p>
${adSlot("second-job-mid")}
<h2>Fortnightly second job tax table ${YEAR_LABEL}</h2>
${grid("fortnightly", 100, 3000, 20)}
<p class="note">Steps of $20 from $100 to $3,000. For monthly pay, see the <a href="/monthly-tax-table/">monthly tax table</a>.</p>
<h2>Where the figures come from</h2>
<p>The amounts follow the ATO's <em>Schedule 1 – Statement of formulas for calculating amounts to be withheld</em> for ${YEAR_LABEL}: scale 1 for no tax-free threshold and scale 2 for a main job. Tax for the year uses the ${YEAR_LABEL} tax rates, the low income tax offset and the Medicare levy. Updated ${UPDATED}.</p>
<p class="more"><a href="/guides/second-job-tax/">Tax on a second job</a><a href="/weekly-tax-table/">Weekly tax table</a><a href="/fortnightly-tax-table/">Fortnightly tax table</a><a href="/tax-refund-calculator/">Tax refund calculator</a></p>
${adSlot("second-job-end")}`;

    write(path, layout({
      path,
      title: `Second job tax table ${YEAR_LABEL}: tax withheld with no tax-free threshold`,
      description: `Tax withheld from a second job in ${YEAR_LABEL}, with no tax-free threshold: weekly and fortnightly tables, and a calculator that checks whether two jobs leave you short at tax time.`,
      hero, body, crumbs: [{ name: "Tax tables", path: "/tax-tables/" }, { name: "Second job tax table", path }],
    }));
  }

  {
    const path = "/tax-tables/";
    const sample = [[1000, 2000, 4333], [1500, 3000, 6500], [2000, 4000, 8667]].map(([w, f, m]) =>
      `<tr><td>${fmt0(w * 52)} a year</td><td>${fmt0(wh(w, "weekly"))} on ${fmt0(w)}</td><td>${fmt0(wh(f, "fortnightly"))} on ${fmt0(f)}</td><td>${fmt0(wh(m, "monthly"))} on ${fmt0(m)}</td></tr>`).join("");
    const body = `<h1>Tax tables ${YEAR_LABEL}</h1>
<p class="intro">How much tax is withheld from your pay in ${YEAR_LABEL}, by how often you're paid. Each table follows the ATO's withholding formulas and has a lookup for any amount.</p>
<ul class="cards">${Object.entries(KINDS).map(([kind, K]) => `<li><a href="/${kind}-tax-table/">${K.label} tax table</a><p>Tax withheld from ${kind} pay of ${fmt0(K.from)} to ${fmt0(K.to)}, with and without the tax-free threshold.</p></li>`).join("")}<li><a href="/seniors-tax-table/">Seniors and pensioners tax table</a><p>Tax withheld from the pay of seniors and pensioners who claim the seniors offset, weekly and fortnightly.</p></li><li><a href="/second-job-tax-table/">Second job tax table</a><p>Tax withheld when you don't claim the tax-free threshold, and whether two jobs leave you short at tax time.</p></li></ul>
<h2>The same salary paid three ways</h2>
<p>Tax withheld each pay for a few salaries, claiming the tax-free threshold. Over a year the totals are almost the same.</p>
<div class="table-scroll"><table><thead><tr><th scope="col">Salary</th><th scope="col">Weekly</th><th scope="col">Fortnightly</th><th scope="col">Monthly</th></tr></thead><tbody>${sample}</tbody></table></div>
<p>For tax for the whole year rather than per pay, see the <a href="/tax-rates/">tax rates for ${YEAR_LABEL}</a> or the <a href="/tax-refund-calculator/">tax refund calculator</a>.</p>`;
    write(path, layout({ path, title: `Tax tables ${YEAR_LABEL}: weekly, fortnightly and monthly tax withheld`, description: `Weekly, fortnightly and monthly tax tables for ${YEAR_LABEL}: tax withheld from your pay with and without the tax-free threshold, from the ATO's formulas.`, body, crumbs: [{ name: "Tax tables", path }] }));
  }
}
