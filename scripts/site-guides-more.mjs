// More guide pages. As with the others, every figure is calculated at build time with the library.

const Y = "2026–27";
const table = (head, rows) => `<div class="table-scroll"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const pct = (x) => `${(Math.round(x * 10) / 10).toFixed(1)}%`;

export const MORE_GUIDES = [
  {
    slug: "bonus-tax",
    short: "Tax on a bonus",
    h1: "Tax on a bonus: how much is withheld and why",
    title: `Tax on a bonus (${Y}): how much comes out, and is super paid on it?`,
    description: "How much tax is withheld from a bonus, why it can look high, what you actually pay at tax time, and whether super is paid on bonuses. With worked amounts for 2026–27.",
    body: ({ calculateBonusWithholding, payRow, fmt, fmt0 }) => {
      const base = 3000;
      const rows = [1000, 2000, 5000, 10000].map((b) => {
        const r = calculateBonusWithholding({ earnings: base, bonus: b, period: "fortnightly" });
        return [fmt(b * 100), fmt(r.withholding * 100), pct((r.withholding / b) * 100), fmt((b - r.withholding) * 100)];
      });
      const lump = payRow((base + 5000) * 100, "fortnightly").tax - payRow(base * 100, "fortnightly").tax;
      const methodA = calculateBonusWithholding({ earnings: base, bonus: 5000, period: "fortnightly" }).withholding * 100;
      return `<p>A bonus is taxed as normal income: at the end of the year it's added to your salary and taxed at your marginal rate. What feels different is the amount your employer withholds from the pay the bonus comes in.</p>
<h2>How much is withheld from a bonus</h2>
<p>Employers use the ATO's Schedule 5 "Method A". It spreads the bonus across the year's pays, works out the extra tax that adds to each pay, and multiplies it back up. For someone paid ${fmt(base * 100)} a fortnight in ${Y}:</p>
${table(["Bonus", "Tax withheld", "Share of bonus", "You receive"], rows)}
<p>The withholding is never more than 47% of the bonus (the top tax rate plus the Medicare levy).</p>
<h2>Why it can look like a lot</h2>
<p>If your employer simply added a ${fmt(500000)} bonus to one fortnight's pay and used the normal tables, ${fmt(lump)} would come out, because the tables would treat you as earning that much every fortnight. Method A takes ${fmt(methodA)}, closer to the tax you'll actually owe on it.</p>
<p>Either way the withholding is only a prepayment. When you lodge your tax return, the bonus is taxed at your real marginal rate and any difference comes back as a refund or adds to a bill.</p>
<h2>Is super paid on bonuses?</h2>
<p>Usually yes. A bonus for your ordinary hours of work, such as a performance, sales, annual or Christmas bonus, counts towards the earnings super guarantee is worked out on, so your employer pays 12% on top: ${fmt0(600)} on a ${fmt0(5000)} bonus. A bonus paid only for overtime hours doesn't attract super, though your award or agreement may still require it. Under Payday Super, the super on a bonus is due in your fund within 7 business days of the payday it comes with.</p>
<h2>HELP debts</h2>
<p>If you have a HELP or other study loan, extra is withheld from the bonus to cover the compulsory repayment.</p>
<p>Add a bonus in the <a href="/">pay calculator</a> or the <a href="/tax-refund-calculator/">tax refund calculator</a> to see your own numbers.</p>`;
    },
  },
  {
    slug: "overtime-tax",
    short: "Tax on overtime",
    h1: "Is overtime taxed more? How tax on overtime works",
    title: `How much is overtime taxed in Australia? (${Y} examples)`,
    description: "Overtime isn't taxed at a special rate, but more tax is withheld from pays with overtime in them. Here's why, how much, and whether super is paid on overtime.",
    body: ({ payRow, fmt }) => {
      const base = 1400;
      const rows = [100, 200, 300, 500].map((ot) => {
        const extra = payRow((base + ot) * 100, "weekly").tax - payRow(base * 100, "weekly").tax;
        return [fmt(ot * 100), fmt(extra), pct((extra / (ot * 100)) * 100), fmt(ot * 100 - extra)];
      });
      return `<p>There's no separate tax rate for overtime. It's ordinary income, added to your pay and taxed at your marginal rate like the rest of your salary.</p>
<h2>Why more tax comes out of a pay with overtime</h2>
<p>Tax withheld is worked out on each pay as if you earned that amount every pay. A week with overtime looks like a higher salary, so the extra dollars are withheld at your top marginal rate. For someone normally paid ${fmt(base * 100)} a week in ${Y}:</p>
${table(["Overtime that week", "Extra tax withheld", "Share withheld", "Extra take-home"], rows)}
<p>Those rates are close to what you'll pay on that income at tax time (your marginal tax rate plus the 2% Medicare levy), so overtime rarely causes a big refund or bill on its own.</p>
<h2>Is super paid on overtime?</h2>
<p>Usually not. The 12% super guarantee is paid on ordinary time earnings, and overtime hours are generally excluded. Check your award or agreement, because a few treat some extra hours as ordinary hours.</p>
<h2>Overtime and a HELP debt</h2>
<p>If you have a study loan, extra is withheld for the compulsory repayment on overtime too. Repayments are worked out on your total income for the year.</p>
<p>Use the <a href="/">pay calculator</a> and open "Add overtime or a bonus" to try your own hours and rate.</p>`;
    },
  },
  {
    slug: "low-income-tax-offset",
    short: "Low income tax offset",
    h1: "The low income tax offset (LITO) for 2025–26 and 2026–27",
    title: "Low income tax offset 2026: how much you get (2025–26 and 2026–27)",
    description: "The low income tax offset cuts the tax of anyone earning under $66,667 by up to $700. Amounts for the 2025–26 tax return you lodge in 2026 and for 2026–27, and how much you can earn before paying tax.",
    body: ({ litoCents, incomeTaxCents, ANNUAL_YEARS, fmt, fmt0 }) => {
      const L = ANNUAL_YEARS["2026-27"].lito;
      const same = JSON.stringify(L) === JSON.stringify(ANNUAL_YEARS["2025-26"].lito);
      const nilUpTo = (y) => { let x = 18200; while (incomeTaxCents(x + 1, { taxYear: y }) - litoCents(x + 1, { taxYear: y }) <= 0) x++; return x; };
      const firstRate = (y) => (incomeTaxCents(19200, { taxYear: y }) - incomeTaxCents(18200, { taxYear: y })) / 1000;
      const rows = [20000, 25000, 30000, 37500, 40000, 45000, 50000, 55000, 60000, 66000].map((i) => [fmt0(i), fmt(litoCents(i, { taxYear: "2025-26" })), fmt(litoCents(i, { taxYear: "2026-27" }))]);
      const ex = 40000;
      const exRows = ["2025-26", "2026-27"].map((y) => { const g = incomeTaxCents(ex, { taxYear: y }); const l = litoCents(ex, { taxYear: y }); return [y.replace("-", "–"), fmt(g), fmt(l), fmt(Math.max(0, g - l))]; });
      return `<p>The low income tax offset (LITO) reduces the income tax of Australian residents on lower incomes. You don't apply for it: the ATO works it out when you lodge your tax return.</p>
<p>Two years matter in 2026: the 2025–26 year, whose tax return most people lodge between July and October 2026, and the ${Y} year, which started on 1 July 2026. ${same ? "The offset is the same in both." : "The amounts differ between them, as shown below."}</p>
<h2>How much it's worth</h2>
<ul>
<li>Taxable income up to ${fmt0(L.firstThreshold)}: the full ${fmt0(L.max)}.</li>
<li>${fmt0(L.firstThreshold)} to ${fmt0(L.secondThreshold)}: ${fmt0(L.max)}, reduced by 5 cents for each dollar over ${fmt0(L.firstThreshold)}.</li>
<li>${fmt0(L.secondThreshold)} to ${fmt0(L.cutOut)}: ${fmt0(L.secondBase)}, reduced by 1.5 cents for each dollar over ${fmt0(L.secondThreshold)}.</li>
<li>${fmt0(L.cutOut)} or more: nothing.</li>
</ul>
<h2>The offset by income in 2025–26 and ${Y}</h2>
${table(["Taxable income", "2025–26", Y], rows)}
<h2>How much you can earn before paying tax</h2>
<p>Because the offset wipes out the tax on low incomes, a resident with no other offsets pays no income tax on a taxable income up to <strong>${fmt0(nilUpTo("2026-27"))}</strong> in ${Y}, and up to ${fmt0(nilUpTo("2025-26"))} in 2025–26, well above the $18,200 tax-free threshold. The ${Y} figure is higher because the first tax rate fell from ${firstRate("2025-26")}% to ${firstRate("2026-27")}%. The Medicare levy is separate. Seniors and pensioners can earn more again: see the <a href="/guides/seniors-tax-offset/">seniors and pensioners tax offset</a>.</p>
<p>On a taxable income of ${fmt0(ex)}:</p>
${table(["Year", "Tax before offsets", "Low income tax offset", "Income tax"], exRows)}
<h2>What it can and can't do</h2>
<ul>
<li>It reduces income tax, but not below zero: any unused amount isn't paid out as a refund.</li>
<li>It doesn't reduce the Medicare levy.</li>
<li>Foreign residents for tax can't get it.</li>
</ul>
<h2>Is it in my pay already?</h2>
<p>Yes, if you claim the tax-free threshold: the ATO's withholding formulas build the offset into the tax taken from each pay. That's why it doesn't usually produce a big refund on its own.</p>
<h2>Is it the same as the low income super tax offset?</h2>
<p>No. The low income super tax offset (LISTO) is paid into your super fund, not taken off your income tax. It refunds the 15% tax your fund pays on concessional contributions (your employer's super and any salary sacrifice), up to $500 a year, if your adjusted taxable income is $37,000 or less. From 1 July 2027 the limit rises to $45,000 and the maximum to $810. You don't claim it: the ATO pays it to your fund, usually after you lodge your tax return.</p>
<p>From 2027–28 a second offset applies: the <a href="/guides/working-australians-tax-offset/">working Australians tax offset</a>, up to $250 for people with work income. The older low and middle income tax offset (LMITO) ended after the 2021–22 year. See the full <a href="/tax-rates/">tax rates for ${Y}</a>, or estimate your own result with the <a href="/tax-refund-calculator/">tax refund calculator</a>.</p>`;
    },
  },
  {
    slug: "medicare-levy-surcharge",
    short: "Medicare levy surcharge",
    h1: "The Medicare levy and the Medicare levy surcharge",
    title: `Medicare levy surcharge thresholds ${Y} (and the 2% levy)`,
    description: "The 2% Medicare levy, who pays less, and the Medicare levy surcharge of 1% to 1.5% for higher earners without private hospital cover. Thresholds for 2025–26 and 2026–27.",
    body: ({ ANNUAL_YEARS, medicareLevySurchargeCents, fmt, fmt0 }) => {
      const tiers = (id) => {
        const y = ANNUAL_YEARS[id];
        const s = y.mlsSingles, f = y.mlsFamily.tiers;
        return [
          ["Base tier", `${fmt0(s[0].upTo)} or less`, `${fmt0(f[0])} or less`, "0%"],
          ["Tier 1", `${fmt0(s[0].upTo + 1)} – ${fmt0(s[1].upTo)}`, `${fmt0(f[0] + 1)} – ${fmt0(f[1])}`, "1%"],
          ["Tier 2", `${fmt0(s[1].upTo + 1)} – ${fmt0(s[2].upTo)}`, `${fmt0(f[1] + 1)} – ${fmt0(f[2])}`, "1.25%"],
          ["Tier 3", `${fmt0(s[2].upTo + 1)} or more`, `${fmt0(f[2] + 1)} or more`, "1.5%"],
        ];
      };
      const M = ANNUAL_YEARS["2026-27"].medicare;
      const ex = [110000, 130000, 170000].map((i) => [fmt0(i), fmt(medicareLevySurchargeCents(i, { privateHospitalCover: false, taxYear: "2026-27" }))]);
      return `<p>Two different charges share a name. The <strong>Medicare levy</strong> is 2% of taxable income and most residents pay it. The <strong>Medicare levy surcharge</strong> is an extra 1% to 1.5% for people on higher incomes who don't have private hospital cover.</p>
<h2>The 2% Medicare levy</h2>
<p>On low incomes you pay less or none. A single person pays nothing up to ${fmt0(M.lowerThreshold)}, and the levy phases in until ${fmt0(M.upperThreshold)}. Families get a higher threshold: ${fmt0(M.familyThreshold)} plus ${fmt0(M.familyPerChild)} for each dependent child. Seniors and pensioners have higher thresholds again. These are the latest legislated thresholds; the ${Y} ones haven't been set yet.</p>
<h2>Medicare levy surcharge thresholds for ${Y}</h2>
${table(["Tier", "Singles", "Families", "Surcharge"], tiers("2026-27"))}
<p>Family thresholds go up by ${fmt0(ANNUAL_YEARS["2026-27"].mlsFamily.perChildAfterFirst)} for each dependent child after the first.</p>
<h2>Thresholds for 2025–26</h2>
${table(["Tier", "Singles", "Families", "Surcharge"], tiers("2025-26"))}
<h2>How much the surcharge costs</h2>
<p>The surcharge is a percentage of your whole taxable income (plus any reportable fringe benefits), not just the part above the threshold. For a single person without hospital cover in ${Y}:</p>
${table(["Income", "Surcharge for the year"], ex)}
<p>The income used to pick your tier is your taxable income plus things like reportable fringe benefits, reportable super contributions and net investment losses. You avoid the surcharge for any days you hold an appropriate level of private hospital cover; extras-only cover doesn't count.</p>
<p>Add or remove hospital cover in the <a href="/tax-refund-calculator/">tax refund calculator</a> to see the difference for you.</p>`;
    },
  },
  {
    slug: "salary-including-super",
    short: "Salary including super",
    h1: "Salary including super: what a package means for your pay",
    title: `Does gross salary include super? Package vs base salary (${Y})`,
    description: "A gross salary usually doesn't include super, but a package does. How to tell which you've been offered, and the base salary, super and take-home pay from a package, with examples.",
    body: ({ splitPackage, payRow, fromAnnual, fmt, fmt0 }) => {
      const rows = [70000, 90000, 110000, 130000].map((p) => {
        const s = splitPackage(p);
        const inc = payRow(fromAnnual(s.salary).fortnightly, "fortnightly");
        const plus = payRow(fromAnnual(p).fortnightly, "fortnightly");
        return [fmt0(p), fmt(s.salaryCents), fmt(s.superCents), fmt(inc.net), fmt(plus.net)];
      });
      return `<p><strong>Does gross salary include super?</strong> Usually not. Gross salary means your pay before tax, and unless the offer says "including super", "package" or "total remuneration", the 12% super guarantee is normally paid on top of it.</p>
<p>Job ads and contracts describe pay in two ways. A salary "<strong>plus super</strong>" means your employer pays the 12% super guarantee on top. A salary "<strong>including super</strong>" (a package, or total remuneration) means the super comes out of the quoted figure.</p>
<h2>Working out the base salary</h2>
<p>Divide the package by 1.12. The rest is the super your employer pays into your fund. Tax is worked out on the base salary only.</p>
${table(["Package", "Base salary", "Super (12%)", "Take-home a fortnight", "If it were plus super"], rows)}
<p>The last column shows the same number as a salary plus super, so you can see what the difference is worth. When comparing offers, convert them both to the same basis first.</p>
<h2>Salary sacrifice</h2>
<p>Packages sometimes let you salary sacrifice extra into super or for other benefits. Salary sacrificed to super is taxed at 15% in the fund instead of your marginal rate, but it counts towards the concessional contributions cap. Salary sacrifice doesn't reduce the super guarantee your employer must pay.</p>
<p>Turn on "Amount includes super" in the <a href="/">pay calculator</a> to split any package.</p>`;
    },
  },
  {
    slug: "seniors-tax-offset",
    short: "Seniors tax offset (SAPTO)",
    h1: "Seniors and pensioners tax offset (SAPTO) and the tax-free threshold for pensioners",
    title: `Seniors and pensioners tax offset (SAPTO) ${Y}: tax-free threshold`,
    description: ({ ANNUAL_YEARS, saptoCents, incomeTaxCents, litoCents, fmt0 }) => {
      const nil = (st) => { let x = 18200; const t = (v) => incomeTaxCents(v, { taxYear: "2026-27" }) - litoCents(v, { taxYear: "2026-27" }) - saptoCents(v, { status: st, spouseRebateIncome: st === "single" ? 0 : v, taxYear: "2026-27" }); while (t(x + 1) <= 0) x++; return x; };
      return `How much pensioners and seniors can earn before paying tax in ${Y}: ${fmt0(nil("single"))} for singles and ${fmt0(nil("couple"))} each for couples. SAPTO amounts, thresholds and a calculator.`;
    },
    body: ({ ANNUAL_YEARS, saptoCents, incomeTaxCents, litoCents, calculateWithholding, fmt, fmt0, segmented, ASSETS }) => {
      const nilUpTo = (y, st) => {
        const t = (v) => incomeTaxCents(v, { taxYear: y }) - litoCents(v, { taxYear: y }) - (st ? saptoCents(v, { status: st, spouseRebateIncome: st === "single" ? 0 : v, taxYear: y }) : 0);
        let x = 18200;
        while (t(x + 1) <= 0) x++;
        return x;
      };
      const S = ANNUAL_YEARS["2026-27"].sapto;
      const ML = ANNUAL_YEARS["2026-27"].medicare.sapto;
      const single = nilUpTo("2026-27", "single"), couple = nilUpTo("2026-27", "couple");
      const thresholds = [["single", "Single"], ["couple", "Couple, each partner"], ["illness-separated", "Couple separated by illness, each"]]
        .map(([st, label]) => [label, fmt0(nilUpTo("2026-27", st)), fmt0(nilUpTo("2025-26", st))]);
      thresholds.push(["Anyone else (no SAPTO)", fmt0(nilUpTo("2026-27")), fmt0(nilUpTo("2025-26"))]);
      const status = [["Single", S.single], ["Couple (each)", S.couple], ["Couple separated by illness (each)", S.illnessSeparated]];
      const rows = [30000, 36000, 40000, 45000, 50000].map((i) => [fmt0(i), fmt(saptoCents(i, { status: "single", taxYear: "2026-27" }))]);
      const w = calculateWithholding({ earnings: 662, period: "weekly" }).withholding;
      const ws = calculateWithholding({ earnings: 662, period: "weekly", seniors: "single" }).withholding;
      const calc = `<form class="calc" id="sapto" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
<label class="field wide"><span>Your taxable income for the year, including any pension</span>
<span class="money-input"><span aria-hidden="true">$</span><input id="s-income" inputmode="decimal" autocomplete="off" placeholder="34,000" aria-describedby="s-income-error"></span>
<span class="error" id="s-income-error" role="alert"></span></label>
${segmented("s-status", "Your situation", [["single", "Single"], ["couple", "Couple"], ["illness-separated", "Separated by illness"]], "single", true, "none")}
<label class="field wide" id="s-spouse-field" hidden><span>Your partner's taxable income</span>
<span class="money-input"><span aria-hidden="true">$</span><input id="s-spouse" inputmode="decimal" autocomplete="off" placeholder="30,000" aria-describedby="s-spouse-error"></span>
<span class="error" id="s-spouse-error" role="alert"></span></label>
${segmented("s-year", "Tax year", [["2025-26", "2025–26"], ["2026-27", Y]], "2026-27", true, "none")}
</div>
</div>
<div class="calc-result" aria-live="polite">
<div id="s-empty"><p class="kicker">Tax for the year</p><p class="big muted">$0.00</p><p class="sub">Enter your taxable income to see your offset and any tax to pay.</p></div>
<div id="s-result" hidden>
<p class="kicker">Tax for the year</p>
<p class="big" id="s-big"></p>
<p class="sub" id="s-sub"></p>
<div class="table-scroll"><table class="compact"><tbody id="s-rows"></tbody></table></div>
</div></div>
<noscript><p class="note">The calculator needs JavaScript. The tables below give the thresholds for each situation.</p></noscript>
</form>
<script type="module" src="${ASSETS}/sapto.js"></script>`;
      return `<p>The seniors and pensioners tax offset (SAPTO) reduces the tax of eligible older Australians and pensioners. Together with the low income tax offset, it means a single senior pays no income tax on a taxable income up to <strong>${fmt0(single)}</strong> in ${Y}, and each partner in a couple up to <strong>${fmt0(couple)}</strong>.</p>
<h2>Check your tax</h2>
${calc}
<p class="note">Assumes you're eligible for SAPTO and have no other offsets. Couples are tested on their combined income.</p>
<h2>Tax-free threshold for pensioners in ${Y}</h2>
<p>The highest taxable income with no income tax once both offsets apply. Couples' figures assume both partners have the same income.</p>
${table(["", Y, "2025–26"], thresholds)}
<p>The Medicare levy is separate. A single senior pays no levy on a taxable income up to ${fmt0(ML.lowerThreshold)}. For couples it depends on combined income: no levy up to ${fmt0(ML.familyThreshold)} combined (latest legislated thresholds).</p>
<h2>Who can get it</h2>
<p>You may be eligible if you receive an Australian Government pension such as the Age Pension, or you've reached Age Pension age (67) and would qualify for the Age Pension except for the income or assets test, and your income is under the cut-out below. Some veterans' pensions also qualify.</p>
<h2>How much it's worth in ${Y}</h2>
${table(["Status", "Maximum offset", "Full offset up to", "Nothing from"], status.map(([l, p]) => [l, fmt0(p.max), fmt0(p.shadeOut), fmt0(p.cutOut)]))}
<p>Above the full-offset threshold the offset falls by 12.5 cents for each dollar of rebate income. Couples are tested on half their combined rebate income. For a single senior:</p>
${table(["Rebate income", "Offset"], rows)}
<h2>Common questions</h2>
<h3>Do pensioners pay tax?</h3>
<p>Only if their taxable income is above the thresholds above. Someone whose only income is the Age Pension usually pays no income tax, because the offsets cover the tax on it. Tax becomes payable when the pension is added to other income, such as wages, interest, rent or investment income.</p>
<h3>Is the Age Pension taxable?</h3>
<p>Yes. The Age Pension counts as taxable income and goes in your tax return; the ATO usually fills it in from Services Australia's records. Some payments that come with it are tax-free, such as Rent Assistance and the Energy Supplement.</p>
<h3>Can my partner use my unused offset?</h3>
<p>Yes. If one partner doesn't need all of their offset to bring their tax to zero, the unused part can be transferred to the other partner. The ATO works it out from both tax returns.</p>
<h3>Does it reduce the tax taken from my pay?</h3>
<p>If you work and claim SAPTO on your withholding declaration, your employer uses the ATO's <a href="/seniors-tax-table/">seniors and pensioners tax table</a>. On ${fmt(66200)} a week, a single senior has ${fmt(ws * 100)} withheld instead of ${fmt(w * 100)}. See <a href="/guides/working-on-the-age-pension/">working part-time on the Age Pension</a> for the Work Bonus and how to avoid a tax bill.</p>
<p>For wages, choose "Senior or pensioner" in the <a href="/">pay calculator</a>, or see your whole year in the <a href="/tax-refund-calculator/">tax refund calculator</a>. Read about the <a href="/guides/low-income-tax-offset/">low income tax offset</a>.</p>`;
    },
  },
  {
    slug: "working-on-the-age-pension",
    short: "Working on the Age Pension",
    h1: "Working part-time on the Age Pension: tax and the Work Bonus",
    title: `Pensioners working part-time (${Y}): tax and the Work Bonus`,
    description: `How much a pensioner can earn from work before the pension drops ($526 a fortnight for a single, with the Work Bonus) and before paying tax, and why working can lead to a tax bill.`,
    body: ({ estimateAnnualTax, calculateWithholding, incomeTaxCents, litoCents, saptoCents, ANNUAL_YEARS, fmt, fmt0 }) => {
      // Services Australia income test and Work Bonus, from 20 September 2026.
      const WB = 300, BANK = 11800, FREE_S = 226, FREE_C = 396;
      const nilFor = (st) => { let x = 18200; const t = (v) => incomeTaxCents(v, { taxYear: "2026-27" }) - litoCents(v, { taxYear: "2026-27" }) - saptoCents(v, { status: st, spouseRebateIncome: st === "single" ? 0 : v, taxYear: "2026-27" }); while (t(x + 1) <= 0) x++; return x; };
      const nil = nilFor("single"), nilC = nilFor("couple");
      const ML = ANNUAL_YEARS["2026-27"].medicare.sapto;
      const pension = 20000;
      const rows = [10000, 15000, 20000, 25000, 30000].map((wages) => {
        const r = estimateAnnualTax({ salary: wages, otherIncome: pension, taxYear: "2026-27", sapto: "single", payFrequency: "fortnightly" });
        const c = r.cents, gap = c.withheld - c.totalLiability;
        return [fmt0(wages), fmt0(r.taxableIncome), c.totalLiability ? fmt(c.totalLiability) : "$0", c.withheld ? fmt(c.withheld) : "$0", gap === 0 ? "Nothing owing" : gap > 0 ? `${fmt(gap)} back` : `${fmt(-gap)} owing`];
      });
      const fn = 1000;
      const seniorsW = calculateWithholding({ earnings: fn, period: "fortnightly", seniors: "single" }).withholding;
      const regularW = calculateWithholding({ earnings: fn, period: "fortnightly" }).withholding;
      const earn = 800, cut = (earn - WB - FREE_S) / 2;
      return `<p>You can work while getting the Age Pension. Two separate sets of rules apply to what you earn: Services Australia's income test decides how much pension you get, and the ATO's tax rules decide how much tax you pay on your pension and wages together.</p>
<h2>How much you can earn</h2>
${table(["", "Single", "Couple"], [
  ["Work income before your pension is reduced (from 20 September 2026)", `${fmt0(WB + FREE_S)} a fortnight`, `${fmt0(WB + FREE_C)} a fortnight combined, if one of you works`],
  [`Taxable income before you pay income tax (${Y})`, `${fmt0(nil)} a year`, `${fmt0(nilC)} a year each`],
])}
<p>The pension figures assume you have no other income. Most pensioners have some deemed income from savings, shares or super, which uses up part of the income free area of ${fmt0(FREE_S)} a fortnight for a single or ${fmt0(FREE_C)} combined for a couple.</p>
<h2>How the Work Bonus works</h2>
<p>The Work Bonus reduces how much of your work income counts in the pension income test. Each fortnight ${fmt0(WB)} of credit goes into your Work Bonus balance, which is used to offset your income from employment or self-employment before the income test is applied. Credit you don't use builds up to a maximum of ${fmt0(BANK)}, so it can absorb a busy fortnight or a short-term job. It doesn't apply to investment income. You don't apply for it: Services Australia applies it when you report your income, and your balance is in your Centrelink online account.</p>
<p>Above the free area, a single person's pension falls by 50 cents for each dollar, and each partner's in a couple by 25 cents for each dollar of combined income. For example, a single pensioner with no balance and no other income who earns ${fmt0(earn)} in a fortnight has ${fmt0(earn - WB)} assessed after the Work Bonus, ${fmt0(earn - WB - FREE_S)} above the free area, so their pension falls by ${fmt(cut * 100)} that fortnight.</p>
<h2>Tax: your pension and wages are added together</h2>
<p>The Age Pension is taxable income, but Services Australia doesn't take tax out of it unless you ask. Your employer only knows about your wages. So tax withheld from your wages may be the only tax paid during the year, even though the pension and wages are taxed together.</p>
<p>Here's a single pensioner with ${fmt0(pension)} of Age Pension over the year who claims the seniors offset with their employer and is paid fortnightly:</p>
${table(["Wages for the year", "Taxable income", "Tax for the year", "Withheld from wages", "At tax time"], rows)}
<p class="note">Taxable income includes the $1,000 standard deduction for work expenses. Tax includes the seniors and low income tax offsets and the Medicare levy (no levy for a single senior up to ${fmt0(ML.lowerThreshold)}).</p>
<p>To avoid a bill, you can ask Services Australia to deduct tax from your pension (a percentage or a set amount, through your Centrelink online account), or ask your employer to withhold more from your pay. If too much is withheld, you get it back when you lodge your tax return.</p>
<h2>Which tax table your employer uses</h2>
<p>If you claim the seniors and pensioners tax offset on a withholding declaration, your employer uses the <a href="/seniors-tax-table/">seniors and pensioners tax table</a>, which withholds less than the regular table. On ${fmt0(fn)} a fortnight, a single senior has ${seniorsW ? fmt(seniorsW * 100) : "nothing"} withheld instead of ${fmt(regularW * 100)}. That suits you when your wages are your main income. When the pension and wages together are well above the tax-free amount, the lower withholding is what leads to the bills above.</p>
<h2>Check your own figures</h2>
<p>Enter your pension and wages together in the <a href="/guides/seniors-tax-offset/">seniors tax calculator</a> to see your tax for the year, or look up the tax withheld from each pay in the <a href="/seniors-tax-table/">seniors tax table</a>. Pension rules are set by Services Australia; check your Centrelink online account for your own Work Bonus balance and payment.</p>`;
    },
  },
  {
    slug: "how-much-tax",
    short: "How much tax do I pay?",
    h1: "How much tax do I pay? Marginal and average tax rates",
    title: `How much tax do I pay in Australia? (${Y} rates by salary)`,
    description: "Tax for the year, average tax rate and marginal rate for salaries from $30,000 to $250,000 in 2026–27, and why a pay rise never leaves you worse off.",
    body: ({ estimateAnnualTax, fmt, fmt0 }) => {
      const total = (s) => estimateAnnualTax({ salary: s, taxYear: "2026-27" }).cents.totalLiability;
      const rows = [30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000, 180000, 200000, 250000].map((s) => {
        const t = total(s);
        const marginal = (total(s + 100) - t) / 100;
        return [`<a href="/salary/${s}/">${fmt0(s)}</a>`, fmt(t), pct((t / (s * 100)) * 100), `${Math.round(marginal * 10) / 10}%`];
      });
      return `<p>Australia taxes income in brackets: nothing on the first $18,200, then 15%, 30%, 37% and 45% on each slice above the thresholds, plus the 2% Medicare levy. So two numbers matter: your <strong>average rate</strong> (total tax as a share of income) and your <strong>marginal rate</strong> (the tax on your next dollar).</p>
<h2>Tax by salary in ${Y}</h2>
${table(["Salary", "Tax for the year", "Average rate", "Marginal rate"], rows)}
<p>Figures are for an Australian resident with no other income, after the $1,000 standard deduction for work expenses, including the low income tax offset and Medicare levy. The marginal rate includes the effect of offsets and the levy phasing in or out, so it isn't always a round bracket rate.</p>
<h2>A pay rise never leaves you worse off</h2>
<p>Moving into a higher bracket only raises the tax on the dollars above the threshold. If your salary goes from $134,000 to $136,000, only the last $1,000 is taxed at 37%.</p>
<h2>Why your pay looks different</h2>
<p>Your employer withholds tax from each pay using the ATO's formulas, which aim to collect roughly the tax for the year. The difference is settled when you lodge your tax return. See <a href="/guides/how-tax-withheld-works/">how tax withheld works</a> and the full <a href="/tax-rates/">tax rates</a>.</p>`;
    },
  },
  {
    slug: "why-do-i-owe-tax",
    short: "Why do I owe tax?",
    h1: "Why do I owe tax? Common reasons for a tax bill",
    title: "Why do I owe the ATO money? 7 common reasons for a tax bill",
    description: "Got a tax bill instead of a refund? The usual causes, from two jobs and HELP debts to income with no tax withheld, with worked examples and how to avoid it next year.",
    body: ({ estimateAnnualTax, payRow, fromAnnual, fmt }) => {
      const twoJobsWithheld = payRow(fromAnnual(40000).fortnightly, "fortnightly").tax * 26 * 2;
      const twoJobsTax = estimateAnnualTax({ salary: 80000, taxYear: "2026-27" }).cents.totalLiability;
      const help = estimateAnnualTax({ salary: 90000, taxYear: "2026-27", studyLoan: true });
      const noHelpWithheld = payRow(fromAnnual(90000).fortnightly, "fortnightly").tax * 26;
      return `<p>A tax bill means less tax was withheld during the year than you owed. The withholding formulas assume one job and no other income, so anything outside that can leave a gap.</p>
<h2>1. Claiming the tax-free threshold from two jobs</h2>
<p>Each employer then assumes your first $18,200 is tax-free. With two $40,000 jobs in ${Y}, both claiming it, ${fmt(twoJobsWithheld)} is withheld but the tax on $80,000 is ${fmt(twoJobsTax)}: a bill of about <strong>${fmt(twoJobsTax - twoJobsWithheld)}</strong>. Claim it from your main job only. See <a href="/guides/second-job-tax/">tax on a second job</a>.</p>
<h2>2. A HELP debt your employer doesn't know about</h2>
<p>If you don't tick the study loan box on your withholding declaration, nothing extra is withheld. On a $90,000 salary the compulsory repayment is ${fmt(help.cents.studyLoan)}, so you'd owe about <strong>${fmt(help.cents.totalLiability - noHelpWithheld)}</strong>. Use the <a href="/help-repayment-calculator/">HELP repayment calculator</a>.</p>
<h2>3. Income with no tax withheld</h2>
<p>Interest, dividends, rent, ABN or side-hustle income and capital gains are all taxable but usually have no tax taken out. Put money aside as you earn it.</p>
<h2>4. No private hospital cover on a higher income</h2>
<p>Singles earning over $105,000 without hospital cover pay the <a href="/guides/medicare-levy-surcharge/">Medicare levy surcharge</a>, which isn't withheld from pay.</p>
<h2>5. Changing jobs and claiming the threshold at both</h2>
<p>Usually fine if the jobs don't overlap, but if they do, or you also had Centrelink payments, too little may have been withheld.</p>
<h2>6. Fewer deductions than last year</h2>
<p>Changes to work-from-home or car claims can turn last year's refund into a bill even with the same income. From ${Y} everyone with work income gets at least the <a href="/guides/standard-deduction/">$1,000 standard deduction</a>, which softens this for people with small claims.</p>
<h2>7. A withholding variation or a lower tax-free amount</h2>
<p>If you asked for less tax to be withheld, or your employer used the wrong tax scale, the gap shows up at tax time.</p>
<h2>How to avoid a bill next year</h2>
<ul>
<li>Update your withholding declaration with each employer (threshold and study loan).</li>
<li>Ask your employer to withhold extra; employees can agree to an upwards variation.</li>
<li>Estimate your result during the year with the <a href="/tax-refund-calculator/">tax refund calculator</a>.</li>
</ul>
<p>If you can't pay a bill in full, the ATO offers payment plans.</p>`;
    },
  },
  {
    slug: "casual-tax",
    short: "Tax for casual workers",
    h1: "Casual tax rate: how much tax casual workers pay",
    title: `Casual tax rate in Australia (${Y}): how much tax casuals pay`,
    description: "There's no separate casual tax rate. How tax is withheld from casual pay, why it changes week to week, super for casuals, and more than one casual job, with 2026–27 examples.",
    body: ({ payRow, fmt, fmt0, ANNUAL_YEARS }) => {
      const B = ANNUAL_YEARS["2026-27"].residentBrackets;
      const bands = B.map((b, i) => i === 0 ? `nothing up to ${fmt0(B[1].over)}` : `${b.rate}% ${B[i + 1] ? `from ${fmt0(b.over + 1)} to ${fmt0(B[i + 1].over)}` : `above ${fmt0(b.over)}`}`);
      const rate = 32;
      const rows = [10, 20, 30, 38].map((h) => {
        const r = payRow(rate * h * 100, "weekly");
        return [`${h} hours`, fmt(r.gross), fmt(r.tax), fmt(r.net)];
      });
      return `<p>There's no separate tax rate for casuals. Casual employees pay the same income tax rates as permanent staff: in ${Y}, ${bands.slice(0, -1).join(", ")} and ${bands.at(-1)}, plus the 2% Medicare levy. Your employer withholds tax from each pay using the ATO's formulas, based on what you earned in that pay.</p>
<h2>Why the tax changes from week to week</h2>
<p>Busy weeks have more tax withheld, quiet weeks less, and short weeks may have none. It evens out when you lodge your tax return. At $${rate} an hour (including casual loading), claiming the tax-free threshold in ${Y}:</p>
${table(["Hours that week", "Gross pay", "Tax withheld", "Take-home pay"], rows)}
<h2>Casual loading</h2>
<p>Casuals usually get a loading (often 25% under modern awards) instead of paid leave. The loading is part of your pay and is taxed the same as the rest.</p>
<h2>More than one casual job</h2>
<p>Claim the tax-free threshold from the job that pays the most, and not from the others, unless your total income for the year will be under $18,200. Claiming it twice is the most common reason casuals get a tax bill.</p>
<h2>Super for casuals</h2>
<p>Since 1 July 2022 there's no minimum monthly earnings test: your employer must pay 12% super on your ordinary time earnings from your first dollar. Workers under 18 need to work more than 30 hours in a week to qualify. Under Payday Super, it must reach your fund within 7 business days of each payday.</p>
<p>Look up any rate on the <a href="/hourly/">hourly rates</a> pages, or see <a href="/guides/second-job-tax/">tax on a second job</a>.</p>`;
    },
  },

  {
    slug: "standard-deduction",
    short: "$1,000 standard deduction",
    h1: "The $1,000 standard deduction for work expenses",
    title: `$1,000 standard deduction for work expenses (${Y}): how it works`,
    description: "From 2026–27, Australians with work income can claim a $1,000 deduction for work-related expenses without receipts. Who gets it, how it changes your refund, and when to itemise instead.",
    body: ({ estimateAnnualTax, fmt, fmt0 }) => {
      // Tax on taxable income of s versus s - 1,000 (income given as non-work income so no standard deduction is added)
      const tax = (ti) => estimateAnnualTax({ salary: 0, otherIncome: ti, taxYear: "2026-27" }).cents.totalLiability;
      const benefit = (s) => tax(s) - tax(s - 1000);
      const table = [40000, 60000, 80000, 100000, 150000, 200000].map((s) => `<tr><td>${fmt0(s)}</td><td>${fmt(benefit(s))}</td></tr>`).join("");
      return `<p>From the ${Y} income year, Australian residents who earn income from work can claim a <strong>$1,000 standard deduction</strong> for work-related expenses on their tax return. You don't need to have spent the money or kept receipts. It became law in June 2026 in the Treasury Laws Amendment (Tax Reform No. 1) Act 2026.</p>
<h2>Who gets it</h2>
<ul>
<li>Australian residents for tax with assessable income from work, such as wages, salary or sole trader income.</li>
<li>The deduction is the lesser of $1,000 and your work income.</li>
<li>Foreign residents can't claim it, and it doesn't apply to investment income on its own.</li>
<li>It starts with ${Y} tax returns, lodged from July 2027. It doesn't apply to 2025–26 returns.</li>
</ul>
<h2>Standard deduction or itemise?</h2>
<p>If your actual work-related expenses (tools, uniforms, work travel, working from home and so on) add up to more than $1,000, claim them instead, with receipts as usual. If they're less, take the standard deduction. You can't have both: work expenses you itemise reduce the standard deduction dollar for dollar.</p>
<p>Deductions that aren't work expenses, such as gifts to charity and tax agent fees, are still claimed on top.</p>
<h2>How much it's worth</h2>
<p>The deduction lowers your taxable income by $1,000, so it's worth your marginal tax rate plus the 2% Medicare levy on that $1,000. For someone with no other deductions in ${Y}:</p>
<div class="table-scroll"><table><thead><tr><th scope="col">Salary</th><th scope="col">Tax saved</th></tr></thead><tbody>${table}</tbody></table></div>
<h2>Does it change my pay?</h2>
<p>No. Tax withheld from each pay stays the same; the saving shows up as a bigger refund, or a smaller bill, when you lodge your return. That's why the refund estimates on this site rose for ${Y}.</p>
<p>See your own figures in the <a href="/tax-refund-calculator/">tax refund calculator</a>.</p>`;
    },
  },
  {
    slug: "working-australians-tax-offset",
    short: "Working Australians tax offset",
    h1: "The working Australians tax offset (WATO)",
    title: "Working Australians tax offset (WATO): $250 from 2027–28",
    description: "A new tax offset of up to $250 for Australians with work income starts in 2027–28. Who gets it, how it's worked out, and what it means with the 14% tax rate.",
    body: ({ estimateAnnualTax, fmt, fmt0 }) => {
      const rows = [30000, 50000, 80000, 120000, 200000].map((s) => {
        const r = estimateAnnualTax({ salary: s, taxYear: "2027-28" });
        return `<tr><td>${fmt0(s)}</td><td>${fmt(r.cents.wato)}</td><td>${fmt(r.cents.totalLiability)}</td></tr>`;
      }).join("");
      return `<p>The working Australians tax offset (WATO) is a new tax offset of up to <strong>$250</strong> a year for Australian residents with income from work. It starts in the <strong>2027–28</strong> income year, so you'll first see it in tax returns lodged from July 2028. It became law in June 2026.</p>
<h2>Who gets it</h2>
<ul>
<li>Australian residents for tax at any time in the year.</li>
<li>Whose net labour income (work income such as wages, salary or sole trader income, less work-related deductions) is more than the $18,200 tax-free threshold.</li>
</ul>
<h2>How much</h2>
<p>Most workers get the full $250. If the income tax on your net labour income is less than $250, the offset is reduced to match; the exact formula for that will be set by the Minister in a legislative instrument. Like the low income tax offset, it's non-refundable: it can reduce your tax to zero but isn't paid out beyond that, and it doesn't reduce the Medicare levy.</p>
<p>Combined with the 14% rate from 1 July 2027, it means a worker can earn about $19,985 before paying income tax, or about $24,985 with the low income tax offset.</p>
<h2>Estimated tax in 2027–28</h2>
<p>For a resident with no other income, after the $1,000 standard deduction (2027–28 thresholds for the Medicare levy aren't published yet, so the latest ones are used):</p>
<div class="table-scroll"><table><thead><tr><th scope="col">Salary</th><th scope="col">WATO</th><th scope="col">Tax for the year</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Will my pay change?</h2>
<p>No. The explanatory memorandum says WATO isn't expected to be built into the PAYG withholding tables, so it shows up when you lodge your return. See the full <a href="/tax-rates/">tax rates</a> or estimate 2027–28 in the <a href="/tax-refund-calculator/">tax refund calculator</a>.</p>`;
    },
  },
];
