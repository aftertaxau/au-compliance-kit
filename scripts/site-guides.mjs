// Guide pages. Every number in a guide is calculated at build time with the library,
// so the guides can't drift from the calculator.
import { MORE_GUIDES } from "./site-guides-more.mjs";

const Y = "2026–27";

export const GUIDES = [
  {
    slug: "tax-free-threshold",
    short: "Tax-free threshold",
    h1: "The tax-free threshold: what it is and when to claim it",
    title: `Tax-free threshold explained (${Y}): when to claim it`,
    description: "The first $18,200 you earn each year is tax-free. Here's how claiming it changes the tax taken from your pay, and why you normally claim it from one employer only.",
    body: ({ payRow, fmt }) => {
      const w = 100000; // $1,000 a week in cents
      const yes = payRow(w, "weekly");
      const no = payRow(w, "weekly", { taxFreeThreshold: false });
      return `<p>If you're an Australian resident for tax, the first $18,200 of your income each financial year is tax-free. When you start a job, the Tax file number declaration asks whether you want to claim this tax-free threshold from that employer.</p>
<h2>What claiming it does to your pay</h2>
<p>Claiming the threshold means your employer withholds less tax from each pay, because it assumes part of your income won't be taxed. On ${fmt(w)} a week in ${Y}:</p>
<div class="table-scroll"><table><thead><tr><th scope="col"></th><th scope="col">Tax withheld</th><th scope="col">Take-home pay</th></tr></thead><tbody>
<tr><td>Claiming the tax-free threshold</td><td>${fmt(yes.tax)}</td><td>${fmt(yes.net)}</td></tr>
<tr><td>Not claiming it</td><td>${fmt(no.tax)}</td><td>${fmt(no.net)}</td></tr>
</tbody></table></div>
<h2>Claim it from one employer</h2>
<p>You only get one tax-free threshold, so you'd normally claim it from the employer who pays you the most and not from any others. If you claim it from two employers at once, too little tax is withheld overall and you may have a bill when you lodge your tax return.</p>
<p>If your total income from all jobs will be under $18,200 for the year, you can claim it from more than one employer.</p>
<h2>Who can't claim it</h2>
<p>Foreign residents for tax can't claim the tax-free threshold. Working holiday makers have their own tax rates.</p>
<p>See how it affects your pay with the <a href="/">pay calculator</a>, or read about <a href="/guides/second-job-tax/">tax on a second job</a>.</p>`;
    },
  },
  {
    slug: "payday-super",
    short: "Payday Super",
    h1: "Payday Super: paying super with every pay from 1 July 2026",
    title: "Payday Super from 1 July 2026: what employers need to do",
    description: "From 1 July 2026 employers must pay super within 7 business days of each payday instead of quarterly. What changed, the deadlines and what happens if you're late.",
    body: () => `<p>Since 1 July 2026, employers have to pay their employees' super guarantee at the same time as wages, not quarterly. The laws, known as Payday Super, received Royal Assent in November 2025.</p>
<h2>What changed</h2>
<ul>
<li><strong>Timing:</strong> super must reach the employee's fund within 7 business days of each payday.</li>
<li><strong>Rate:</strong> the super guarantee is 12%, now calculated on "qualifying earnings".</li>
<li><strong>Reporting:</strong> each Single Touch Payroll report now includes year-to-date qualifying earnings and the super liability for each employee.</li>
<li><strong>Clearing house:</strong> the ATO's free Small Business Superannuation Clearing House closed on 1 July 2026, so small businesses need another way to pay, usually through their payroll software or a commercial clearing house.</li>
</ul>
<h2>The last quarterly payment</h2>
<p>Super for the April to June 2026 quarter was still due under the old rules, by 28 July 2026. Everything paid from 1 July 2026 falls under Payday Super.</p>
<h2>If super is late</h2>
<p>Late or unpaid super can attract the super guarantee charge, which costs more than the super itself. The ATO has said it will take a reasonable approach in the first 12 months for employers making a genuine effort to comply.</p>
<h2>What it means for employees</h2>
<p>Your super should now show up in your fund within about a week and a half of each payday, so it's much easier to spot when it's missing. You can check contributions in your super fund's app or in myGov.</p>
<p>Use the <a href="/">pay calculator</a> to see the 12% super on any salary.</p>`,
  },
  {
    slug: "second-job-tax",
    short: "Tax on a second job",
    h1: "Tax on a second job",
    title: `Tax on a second job in Australia (${Y})`,
    description: "Why more tax comes out of a second job, how much more, and how to avoid a tax bill at the end of the year.",
    body: ({ payRow, fmt }) => {
      const amounts = [30000, 50000, 70000];
      const rows = amounts.map((c) => {
        const main = payRow(c, "weekly");
        const second = payRow(c, "weekly", { taxFreeThreshold: false });
        return `<tr><td>${fmt(c)}</td><td>${fmt(main.tax)}</td><td>${fmt(second.tax)}</td></tr>`;
      }).join("");
      return `<p>When you have more than one job, you normally claim the tax-free threshold from your main job only. Your second employer then withholds tax as if every dollar is taxable, so more comes out of each pay.</p>
<h2>How much more is withheld</h2>
<div class="table-scroll"><table><thead><tr><th scope="col">Weekly pay</th><th scope="col">Withheld as main job</th><th scope="col">Withheld as second job</th></tr></thead><tbody>${rows}</tbody></table></div>
<p>This isn't extra tax. It makes sure enough is withheld across both jobs so you don't end up with a bill. Any overpayment comes back when you lodge your tax return.</p>
<h2>When you might still owe tax</h2>
<p>Each employer only knows about the pay it gives you. If your combined income pushes you into a higher tax bracket, the amounts withheld can still fall short. If that's likely, you can ask an employer to withhold extra.</p>
<p>See your figures on the <a href="/">pay calculator</a> by choosing "No (second job)" for the tax-free threshold.</p>`;
    },
  },
  {
    slug: "no-tfn-tax",
    short: "No TFN tax rate",
    h1: "What happens if you don't give your employer a TFN",
    title: "No tax file number? Why 47% tax is taken from your pay",
    description: "Without a tax file number your employer must withhold tax at the top rate: 47% for residents and 45% for foreign residents. Here's what that looks like and how to fix it.",
    body: ({ payRow, fmt }) => {
      const c = 100000;
      const withTfn = payRow(c, "weekly");
      const noTfn = payRow(c, "weekly", { tfnProvided: false });
      return `<p>If you don't give your employer your tax file number (TFN), they have to withhold tax at the top marginal rate: 47% of your pay if you're an Australian resident, or 45% if you're a foreign resident. You also can't claim the tax-free threshold.</p>
<h2>The difference on ${fmt(c)} a week</h2>
<div class="table-scroll"><table><thead><tr><th scope="col"></th><th scope="col">Tax withheld</th><th scope="col">Take-home pay</th></tr></thead><tbody>
<tr><td>TFN provided, tax-free threshold claimed</td><td>${fmt(withTfn.tax)}</td><td>${fmt(withTfn.net)}</td></tr>
<tr><td>No TFN (resident)</td><td>${fmt(noTfn.tax)}</td><td>${fmt(noTfn.net)}</td></tr>
</tbody></table></div>
<h2>How to fix it</h2>
<p>Give your employer your TFN on a Tax file number declaration, usually through their onboarding system. If you don't have a TFN yet, you can apply for one with the ATO. Extra tax withheld while you had no TFN counts towards your tax for the year and is sorted out when you lodge your return.</p>
<p>Check your pay on the <a href="/">pay calculator</a>.</p>`;
    },
  },
  {
    slug: "foreign-resident-tax",
    short: "Foreign resident tax",
    h1: "Tax withheld for foreign residents",
    title: `Foreign resident tax rates on pay in Australia (${Y})`,
    description: `Foreign residents can't claim the tax-free threshold and don't pay the Medicare levy. The ${Y} withholding rates and worked examples.`,
    body: ({ payRow, fmt }) => {
      const rows = [100000, 200000, 300000, 400000].map((c) => {
        const f = payRow(c, "weekly", { foreignResident: true });
        const r = payRow(c, "weekly");
        return `<tr><td>${fmt(c)}</td><td>${fmt(f.tax)}</td><td>${fmt(r.tax)}</td></tr>`;
      }).join("");
      return `<p>If you're a foreign resident for tax purposes, a separate withholding scale applies. You can't claim the tax-free threshold, so tax is withheld from your first dollar, and you don't pay the Medicare levy.</p>
<h2>Withholding rates for ${Y}</h2>
<ul>
<li>30% on weekly earnings up to $2,596 (about $135,000 a year)</li>
<li>37% on weekly earnings from $2,596 to $3,653 (about $190,000 a year)</li>
<li>45% above that</li>
</ul>
<h2>Compared with residents</h2>
<div class="table-scroll"><table><thead><tr><th scope="col">Weekly pay</th><th scope="col">Foreign resident</th><th scope="col">Resident (threshold claimed)</th></tr></thead><tbody>${rows}</tbody></table></div>
<p>Working holiday makers (on visa subclass 417 or 462) use different rates again. Whether you're a resident for tax isn't the same as your visa status; the ATO has a residency test to help you work it out.</p>
<p>Try your numbers on the <a href="/">pay calculator</a>.</p>`;
    },
  },
  {
    slug: "how-tax-withheld-works",
    short: "How tax withheld works",
    h1: "How your employer works out the tax on your pay",
    title: "How tax withheld is calculated in Australia (step by step)",
    description: "The exact method employers and payroll software use to work out tax withheld: weekly equivalents, the ATO formula and the rounding rules.",
    body: ({ calculateWithholding, fmt }) => {
      const ex = calculateWithholding({ earnings: 1500, period: "fortnightly" });
      return `<p>Employers don't guess the tax on your pay. They use formulas the ATO publishes each year, either through payroll software or the ATO's tax tables. Here's how it works for ${Y}.</p>
<h2>1. Convert your pay to a weekly amount</h2>
<p>The formulas are written for weekly pay. A fortnightly pay is halved. A monthly pay is multiplied by 3 and divided by 13. Cents are dropped, then 99 cents is added.</p>
<h2>2. Pick the right scale</h2>
<p>The scale depends on your Tax file number declaration: whether you claimed the tax-free threshold, whether you're a foreign resident, whether you gave a TFN, and whether you claimed a Medicare levy exemption.</p>
<h2>3. Apply the formula</h2>
<p>Each scale has income bands, and each band has two numbers, a and b. Weekly tax withheld is a × weekly earnings − b, rounded to the nearest dollar (50 cents rounds up).</p>
<h2>4. Convert back to your pay period</h2>
<p>The weekly amount is doubled for a fortnightly pay, or multiplied by 13 and divided by 3 for a monthly pay. Any tax offsets or Medicare levy adjustment you've claimed are then taken off.</p>
<h2>Worked example</h2>
<p>On $1,500 a fortnight with the tax-free threshold claimed, the weekly equivalent is $750.99. The ${Y} scale 2 formula for that band is 0.1790 × 750.99 − 60.8377 = 73.59, which rounds to $74 a week, or <strong>${fmt(ex.withholding * 100)}</strong> a fortnight.</p>
<p>Our <a href="/about/">calculator</a> follows these steps exactly and is checked against the ATO's sample data.</p>`;
    },
  },
  {
    slug: "pay-frequency-and-tax",
    short: "Pay frequency and tax",
    h1: "Weekly, fortnightly or monthly pay: does it change your tax?",
    title: "Does being paid weekly, fortnightly or monthly change your tax?",
    description: "How much tax is withheld can differ by a few dollars a year depending on how often you're paid. Why, and what happens in years with 53 weekly or 27 fortnightly pays.",
    body: ({ payRow, fromAnnual, fmt }) => {
      const salary = 80000;
      const a = fromAnnual(salary);
      const w = payRow(a.weekly, "weekly"), f = payRow(a.fortnightly, "fortnightly"), m = payRow(a.monthly, "monthly");
      return `<p>Your tax for the year is the same however often you're paid. The amount withheld can differ slightly, because each pay is rounded separately.</p>
<h2>Example: $80,000 a year</h2>
<div class="table-scroll"><table><thead><tr><th scope="col">Paid</th><th scope="col">Tax withheld per pay</th><th scope="col">Withheld over a year</th></tr></thead><tbody>
<tr><td>Weekly (52 pays)</td><td>${fmt(w.tax)}</td><td>${fmt(w.tax * 52)}</td></tr>
<tr><td>Fortnightly (26 pays)</td><td>${fmt(f.tax)}</td><td>${fmt(f.tax * 26)}</td></tr>
<tr><td>Monthly (12 pays)</td><td>${fmt(m.tax)}</td><td>${fmt(m.tax * 12)}</td></tr>
</tbody></table></div>
<p>Any small difference is evened out when you lodge your tax return.</p>
<h2>Years with 53 or 27 pays</h2>
<p>Every so often the calendar gives a year 53 weekly paydays or 27 fortnightly ones. The tax tables assume 52 or 26, so the extra pay can leave you a little short. You can ask your employer to withhold a bit more each pay:</p>
<ul>
<li>Weekly: an extra $3 on $875–$2,574, $7 on $2,575–$3,649, or $12 on $3,650 and over.</li>
<li>Fortnightly: an extra $12 on $1,700–$5,199, $27 on $5,200–$7,249, or $48 on $7,250 and over.</li>
</ul>
<p>Compare pay frequencies for any amount on the <a href="/">pay calculator</a>, or look up the tax withheld in the <a href="/weekly-tax-table/">weekly</a>, <a href="/fortnightly-tax-table/">fortnightly</a> and <a href="/monthly-tax-table/">monthly</a> tax tables.</p>`;
    },
  },
  {
    slug: "tax-changes-2026-27",
    short: "2026–27 tax changes",
    h1: "What changed for tax on your pay from 1 July 2026",
    title: "Tax changes from 1 July 2026: what's different on your payslip",
    description: "The 16% tax rate dropped to 15% on 1 July 2026, super now has to be paid every payday, and new tax tables apply. What it means for your take-home pay.",
    body: () => `<p>A few changes took effect on 1 July 2026 that affect the tax taken from your pay and how your super is paid.</p>
<h2>The 16% rate dropped to 15%</h2>
<p>The tax rate on income between $18,201 and $45,000 fell from 16% to 15%, so most people have slightly less tax withheld from each pay. It's legislated to fall again, to 14%, from 1 July 2027.</p>
<h2>New tax tables</h2>
<p>The ATO published new withholding formulas for pays made from 1 July 2026. They apply to any pay made on or after that day, even if part of the pay period was worked in June.</p>
<h2>Super paid every payday</h2>
<p>Under <a href="/guides/payday-super/">Payday Super</a>, employers now have to pay super within 7 business days of each payday instead of quarterly. The super guarantee rate stays at 12%.</p>
<h2>A $1,000 standard deduction for work expenses</h2>
<p>From ${Y}, everyone with work income can claim a $1,000 standard deduction for work-related expenses on their tax return without receipts. If your actual work expenses are higher, you claim those instead. It doesn't change the tax taken from your pay, but it raises most people's refund at tax time. See <a href="/guides/standard-deduction/">how the standard deduction works</a>.</p>
<h2>Medicare levy low-income threshold</h2>
<p>In the ${Y} withholding tables, no Medicare levy is withheld for singles earning up to $28,011 a year, and it's phased in up to $35,013.</p>
<p>See your new take-home pay with the <a href="/">pay calculator</a>.</p>`,
  },
];
GUIDES.push(...MORE_GUIDES);
