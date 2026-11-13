// More guide pages. As with the others, every figure is calculated at build time with the library.

const Y = "2026–27";
const table = (head, rows) => `<div class="table-scroll"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const pct = (x) => `${(Math.round(x * 10) / 10).toFixed(1)}%`;

export const MORE_GUIDES = [
  {
    slug: "bonus-tax",
    short: "Tax on a bonus",
    h1: "Tax on a bonus: how much is withheld and why",
    title: `Tax on a bonus in Australia (${Y}): how much comes out`,
    description: "How employers work out the tax withheld from a bonus, why it can look high, and what you actually pay at tax time. With worked amounts for 2026–27.",
    body: ({ calculateBonusWithholding, payRow, fmt }) => {
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
<h2>HELP debts and super</h2>
<ul>
<li>If you have a HELP or other study loan, extra is withheld from the bonus to cover the compulsory repayment.</li>
<li>Most bonuses tied to your ordinary work count as ordinary time earnings, so your employer pays 12% super on them. A bonus paid only for overtime doesn't attract super.</li>
</ul>
<p>Add a bonus in the <a href="/">pay calculator</a> or the <a href="/tax-refund-calculator/">tax refund calculator</a> to see your own numbers.</p>`;
    },
  },
  {
    slug: "overtime-tax",
    short: "Tax on overtime",
    h1: "Is overtime taxed more? How tax on overtime works",
    title: `Tax on overtime in Australia (${Y}): is it taxed more?`,
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
    h1: "The low income tax offset (LITO)",
    title: `Low income tax offset ${Y}: how much you get`,
    description: "The low income tax offset cuts the tax of anyone earning under $66,667 by up to $700. How it's calculated, who gets it, and a table of amounts for 2026–27.",
    body: ({ litoCents, ANNUAL_YEARS, fmt, fmt0 }) => {
      const L = ANNUAL_YEARS["2026-27"].lito;
      const rows = [30000, 37500, 40000, 45000, 50000, 55000, 60000, 66000].map((i) => [fmt0(i), fmt(litoCents(i, { taxYear: "2026-27" }))]);
      return `<p>The low income tax offset (LITO) reduces the income tax of Australian residents on lower incomes. You don't apply for it: the ATO works it out when you lodge your tax return.</p>
<h2>How much it's worth</h2>
<ul>
<li>Taxable income up to ${fmt0(L.firstThreshold)}: the full ${fmt0(L.max)}.</li>
<li>${fmt0(L.firstThreshold)} to ${fmt0(L.secondThreshold)}: ${fmt0(L.max)}, reduced by 5 cents for each dollar over ${fmt0(L.firstThreshold)}.</li>
<li>${fmt0(L.secondThreshold)} to ${fmt0(L.cutOut)}: ${fmt0(L.secondBase)}, reduced by 1.5 cents for each dollar over ${fmt0(L.secondThreshold)}.</li>
<li>${fmt0(L.cutOut)} or more: nothing.</li>
</ul>
${table(["Taxable income", `Offset in ${Y}`], rows)}
<h2>What it can and can't do</h2>
<ul>
<li>It reduces income tax, but not below zero: any unused amount isn't paid out as a refund.</li>
<li>It doesn't reduce the Medicare levy.</li>
<li>Foreign residents for tax can't get it.</li>
</ul>
<h2>Is it in my pay already?</h2>
<p>Yes, if you claim the tax-free threshold: the ATO's withholding formulas build the offset into the tax taken from each pay. That's why it doesn't usually produce a big refund on its own.</p>
<p>The older low and middle income tax offset (LMITO) ended after the 2021–22 year. See the full <a href="/tax-rates/">tax rates for ${Y}</a>.</p>`;
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
    title: `Salary including super (${Y}): package vs base salary`,
    description: "Some jobs quote a total package that includes the 12% super guarantee. How to work out the base salary, super and take-home pay from a package, with examples.",
    body: ({ splitPackage, payRow, fromAnnual, fmt, fmt0 }) => {
      const rows = [70000, 90000, 110000, 130000].map((p) => {
        const s = splitPackage(p);
        const inc = payRow(fromAnnual(s.salary).fortnightly, "fortnightly");
        const plus = payRow(fromAnnual(p).fortnightly, "fortnightly");
        return [fmt0(p), fmt(s.salaryCents), fmt(s.superCents), fmt(inc.net), fmt(plus.net)];
      });
      return `<p>Job ads and contracts describe pay in two ways. A salary "<strong>plus super</strong>" means your employer pays the 12% super guarantee on top. A salary "<strong>including super</strong>" (a package, or total remuneration) means the super comes out of the quoted figure.</p>
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
    h1: "The seniors and pensioners tax offset (SAPTO)",
    title: `Seniors and pensioners tax offset (SAPTO) ${Y}`,
    description: "SAPTO lets eligible seniors and pensioners earn more before paying tax. Maximum offsets, income thresholds for singles and couples in 2026–27, and how it changes tax withheld.",
    body: ({ ANNUAL_YEARS, saptoCents, incomeTaxCents, litoCents, calculateWithholding, fmt, fmt0 }) => {
      const S = ANNUAL_YEARS["2026-27"].sapto;
      let taxFree = 18200; // highest income with no income tax for a single senior (before the Medicare levy)
      while (incomeTaxCents(taxFree + 1, { taxYear: "2026-27" }) - litoCents(taxFree + 1, { taxYear: "2026-27" }) - saptoCents(taxFree + 1, { status: "single", taxYear: "2026-27" }) <= 0) taxFree++;
      const status = [["Single", S.single], ["Couple (each)", S.couple], ["Couple separated by illness (each)", S.illnessSeparated]];
      const rows = [30000, 36000, 40000, 45000, 50000].map((i) => [fmt0(i), fmt(saptoCents(i, { status: "single", taxYear: "2026-27" }))]);
      const w = calculateWithholding({ earnings: 662, period: "weekly" }).withholding;
      const ws = calculateWithholding({ earnings: 662, period: "weekly", seniors: "single" }).withholding;
      const ML = ANNUAL_YEARS["2026-27"].medicare.sapto;
      return `<p>The seniors and pensioners tax offset (SAPTO) reduces the tax of eligible older Australians and pensioners. With the low income tax offset, it lets a single senior earn up to ${fmt0(taxFree)} in ${Y} before paying any income tax.</p>
<h2>Who can get it</h2>
<p>You may be eligible if you receive an Australian Government pension such as the Age Pension, or you've reached Age Pension age (67) and would qualify for the Age Pension except for the income or assets test, and your income is under the cut-out below. Some veterans' pensions also qualify.</p>
<h2>How much it's worth in ${Y}</h2>
${table(["Status", "Maximum offset", "Full offset up to", "Nothing from"], status.map(([l, p]) => [l, fmt0(p.max), fmt0(p.shadeOut), fmt0(p.cutOut)]))}
<p>Above the full-offset threshold the offset falls by 12.5 cents for each dollar of rebate income. Couples are tested on half their combined rebate income. For a single senior:</p>
${table(["Rebate income", "Offset"], rows)}
<h2>Less tax taken from your pay</h2>
<p>If you work and claim SAPTO on your withholding declaration, your employer uses the ATO's seniors tables. On ${fmt(66200)} a week, a single senior has ${fmt(ws * 100)} withheld instead of ${fmt(w * 100)}.</p>
<h2>Medicare levy</h2>
<p>People entitled to SAPTO also have higher Medicare levy thresholds: a single senior pays no levy up to ${fmt0(ML.lowerThreshold)}, phasing in to ${fmt0(ML.upperThreshold)} (latest legislated thresholds).</p>
<p>Choose "Senior or pensioner" in the <a href="/">pay calculator</a> or <a href="/tax-refund-calculator/">tax refund calculator</a>.</p>`;
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
<p>Figures are for an Australian resident with no other income or deductions, including the low income tax offset and Medicare levy. The marginal rate includes the effect of offsets and the levy phasing in or out, so it isn't always a round bracket rate.</p>
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
    title: "Why do I owe tax? 7 common reasons for an ATO bill",
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
<p>Changes to work-from-home or car claims can turn last year's refund into a bill even with the same income.</p>
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
    h1: "Tax for casual workers",
    title: `Casual worker tax in Australia (${Y}): how much comes out`,
    description: "How tax is withheld from casual pay, why it changes week to week, super for casuals, and what happens with more than one casual job. With 2026–27 examples.",
    body: ({ payRow, fmt }) => {
      const rate = 32;
      const rows = [10, 20, 30, 38].map((h) => {
        const r = payRow(rate * h * 100, "weekly");
        return [`${h} hours`, fmt(r.gross), fmt(r.tax), fmt(r.net)];
      });
      return `<p>Casual employees are taxed the same way as permanent staff. Your employer withholds tax from each pay using the ATO's formulas, based on what you earned in that pay.</p>
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
];
