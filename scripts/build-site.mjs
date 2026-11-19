// Static site generator for the free calculator site.
// Renders every page to dist/ as plain HTML, using the library for all figures.
//   node scripts/build-site.mjs   (SITE_URL=https://preview.example overrides the domain)
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { calculateWithholding, calculateBonusWithholding, estimateAnnualTax, splitPackage, ANNUAL_YEARS, incomeTaxCents, litoCents, saptoCents, medicareLevySurchargeCents, studyLoanRepaymentCents } from "../src/index.js";
import { TOOLS, runTool } from "../src/agent/tools.js";
import { VERSION } from "../src/version.js";
import { GUIDES } from "./site-guides.mjs";
import { buildExtraPages } from "./site-extra.mjs";
import { buildTaxTables } from "./site-tables.mjs";
import { LOCALES, localizedPathsFor, buildLocalizedPages } from "./site-i18n.mjs";

const SITE_NAME = process.env.SITE_NAME || "AfterTax AU";
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "hello@aftertaxau.com";

// Ads (Google AdSense). Off unless ADSENSE_CLIENT (ca-pub-...) and ADSENSE_SLOT (a responsive display
// unit id) are set. ADS_PREVIEW=1 shows grey placeholders where ads will go, without loading any ads.
const ADS = {
  client: process.env.ADSENSE_CLIENT || "",
  slot: process.env.ADSENSE_SLOT || "",
  preview: process.env.ADS_PREVIEW === "1",
};
ADS.enabled = Boolean(ADS.client && ADS.slot);

/** An ad slot with space reserved up front so the page doesn't jump when the ad loads. */
function adSlot(name) {
  if (ADS.enabled) {
    return `<aside class="ad" data-ad="${name}" aria-label="Advertisement"><span class="ad-label">Advertisement</span><ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ADS.client)}" data-ad-slot="${esc(ADS.slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script></aside>`;
  }
  if (ADS.preview) return `<aside class="ad ad-preview" data-ad="${name}" aria-hidden="true"><span class="ad-label">Advertisement</span><div class="ad-box">Ad space · ${name}</div></aside>`;
  return "";
}
const BASE = (process.env.SITE_URL || "https://aftertaxau.com").replace(/\/$/, "");
const YEAR_LABEL = "2026–27";
const UPDATED = "13 November 2026";
const SUPER_PER_MILLE = 120; // 12% super guarantee

const root = new URL("..", import.meta.url);
const out = new URL("dist/", root);

// Scripts and styles go in a folder named after a hash of their contents, so browsers always load
// the current version after a deploy (old cached files simply stop being referenced).
function hashDir(dirUrl, hash) {
  for (const name of readdirSync(dirUrl).sort()) {
    const child = new URL(name, dirUrl);
    if (statSync(child).isDirectory()) hashDir(new URL(name + "/", dirUrl), hash);
    else hash.update(name).update(readFileSync(child));
  }
  return hash;
}
const BUILD_ID = hashDir(new URL("src/", root), hashDir(new URL("site/assets/", root), createHash("sha256"))).digest("hex").slice(0, 10);
const ASSETS = `/assets/${BUILD_ID}`;
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// ---------- numbers ----------
const money = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const money0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const fmt = (cents) => money.format(cents / 100);
const fmt0 = (dollars) => money0.format(dollars);
const PERIODS = [
  ["weekly", "Week", 52],
  ["fortnightly", "Fortnight", 26],
  ["monthly", "Month", 12],
];

function payRow(periodCents, period, opts = {}) {
  const r = calculateWithholding({ earnings: periodCents / 100, period, ...opts });
  const tax = r.withholding * 100;
  return { gross: periodCents, tax, net: periodCents - tax, superC: Math.round((periodCents * SUPER_PER_MILLE) / 1000), scale: r.scale };
}

/** Period amounts (in cents) from an annual salary in dollars. */
function fromAnnual(salary) {
  return Object.fromEntries(PERIODS.map(([p, , n]) => [p, Math.round((salary * 100) / n)]));
}
/** Period amounts (in cents) from an hourly rate and weekly hours. */
function fromHourly(rate, hours) {
  const weekly = Math.round(rate * hours * 100);
  return { weekly, fortnightly: weekly * 2, monthly: Math.round((weekly * 52) / 12) };
}

// ---------- html ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The logo mark: a pie ring, take-home in white and the tax slice in orange (same as favicon.svg). */
function logoMark(light = false) {
  const tile = light ? "#fff" : "#0f2c4c";
  const ring = light ? "#0f2c4c" : "#fff";
  const tax = light ? "#d9653b" : "#f2875a";
  return `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="8" fill="${tile}"/><g transform="rotate(-90 16 16)" fill="none" stroke-width="4.5"><circle cx="16" cy="16" r="8.25" stroke="${ring}" stroke-dasharray="39.4 51.84"/><circle cx="16" cy="16" r="8.25" stroke="${tax}" stroke-dasharray="9.6 51.84" stroke-dashoffset="-40.8"/></g></svg>`;
}
const LOGO_WORD = `<span class="logo-word"><span class="logo-after">after</span>tax<span class="logo-au">AU</span></span>`;

const FOOTER_SALARIES = [50000, 60000, 70000, 75000, 80000, 85000, 90000, 100000, 120000, 150000];
const FOOTER_TOOLS = [["/", "Pay calculator"], ["/tax-refund-calculator/", "Tax refund calculator"], ["/tax-rates/", "Tax rates 2026–27"], ["/help-repayment-calculator/", "HECS-HELP repayments"], ["/gst-calculator/", "GST calculator"], ["/payslip-checker/", "Payslip checker"], ["/rent/", "Rent vs pay"], ["/jobs/", "Pay by job"], ["/weekly/", "Weekly pay after tax"], ["/fortnightly/", "Fortnightly pay after tax"], ["/tax-tables/", "Tax tables 2026–27"], ["/hourly/", "Hourly rates"]];

function footerHtml() {
  return `<footer class="site-footer">
<div class="wrap footer-grid">
<div class="footer-about"><a class="logo logo-light" href="/" aria-label="${esc(SITE_NAME)} home">${logoMark(true)}${LOGO_WORD}</a>
<p>Free take-home pay figures for Australia, worked out with the ATO's own withholding formulas for ${YEAR_LABEL}.</p></div>
<nav aria-label="Popular salaries"><h2>Popular salaries</h2><ul>${FOOTER_SALARIES.map((s) => `<li><a href="/salary/${s}/">${fmt0(s)} after tax</a></li>`).join("")}</ul></nav>
<nav aria-label="Calculators"><h2>Calculators</h2><ul>${FOOTER_TOOLS.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("")}</ul></nav>
<nav aria-label="Guides"><h2>Guides</h2><ul>${GUIDES.slice(0, 6).map((g) => `<li><a href="/guides/${g.slug}/">${esc(g.short)}</a></li>`).join("")}<li><a href="/guides/">All guides</a></li></ul></nav>
</div>
<div class="wrap footer-bottom">
<p>Figures show tax withheld from each pay using the ATO's PAYG withholding formulas for pays made from 1 July 2026 (Schedule 1, NAT 1004), checked against the ATO's published sample data. Your actual tax for the year is worked out when you lodge your tax return. General information only, not financial or tax advice. Not affiliated with the Australian Taxation Office.</p>
${LOCALES.length ? `<p class="lang-links">${LOCALES.map((l) => `<a href="/${l.code}/" lang="${l.t.htmlLang}">${esc(l.t.langName)}</a>`).join(" · ")}</p>` : ""}
<p><a href="/tax-refund-calculator/">Tax refund calculator</a> · <a href="/about/">How we calculate</a> · <a href="/privacy/">Privacy</a> · <a href="/contact/">Contact</a> · <a href="/developers/">API and AI agents</a> · <a href="/salary/">All salaries</a> · <a href="/sitemap.xml">Sitemap</a></p>
</div>
</footer>`;
}

function layout({ path, title, description, body, crumbs = [], jsonld = [], hero = "", locale = null }) {
  const url = BASE + path;
  // hreflang alternates: English pages that have translations, and translated pages back to English
  const alt = localizedPathsFor(path);
  const altLinks = alt ? Object.entries(alt).map(([lang, p]) => `<link rel="alternate" hreflang="${lang}" href="${BASE}${p}">`).join("\n") + `\n<link rel="alternate" hreflang="x-default" href="${BASE}${alt["en-AU"]}">` : "";
  const t = locale?.t;
  const breadcrumb = crumbs.length ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: t ? t.crumbHome : "Home", path: locale ? `/${locale.code}/` : "/" }, ...crumbs].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: BASE + c.path })),
  } : null;
  const ld = [...jsonld, breadcrumb].filter(Boolean).map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");
  const crumbHtml = crumbs.length
    ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="${locale ? `/${locale.code}/` : "/"}">${t ? esc(t.crumbHome) : "Home"}</a>${crumbs.map((c, i) => i === crumbs.length - 1 ? ` › <span>${esc(c.name)}</span>` : ` › <a href="${c.path}">${esc(c.name)}</a>`).join("")}</nav>`
    : "";
  return `<!doctype html>
<html lang="${t ? t.htmlLang : "en-AU"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.classList.add("js")</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${altLinks}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${t ? t.ogLocale : "en_AU"}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="${ASSETS}/styles.css">
${ADS.enabled ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ADS.client)}" crossorigin="anonymous"></script>` : ""}
${ld}
</head>
<body>
<header class="site-header"><div class="wrap header-inner">
<a class="logo" href="${locale ? `/${locale.code}/` : "/"}" aria-label="${esc(SITE_NAME)} home">${logoMark()}${LOGO_WORD}</a>
${locale ? locale.nav(path) : `<nav class="nav" id="site-nav" aria-label="Main"><a href="/"${path === "/" ? ' aria-current="page"' : ""}>Pay calculator</a><a href="/tax-refund-calculator/"${path.startsWith("/tax-refund") ? ' aria-current="page"' : ""}>Tax refund</a><a href="/tax-rates/"${path.startsWith("/tax-rates") ? ' aria-current="page"' : ""}>Tax rates</a><a href="/salary/"${path.startsWith("/salary/") ? ' aria-current="page"' : ""}>Salaries</a><a href="/jobs/"${path.startsWith("/jobs/") ? ' aria-current="page"' : ""}>Pay by job</a><a href="/guides/"${path.startsWith("/guides/") ? ' aria-current="page"' : ""}>Guides</a></nav>`}
<span class="badge" data-year-badge>${t ? YEAR_LABEL : `${YEAR_LABEL} tax rates`}</span>
<button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav"><span class="menu-icon" aria-hidden="true"></span><span class="menu-text">Menu</span></button>
</div></header>
${hero ? `<section class="hero"><div class="wrap">${crumbHtml}${hero}</div></section>` : ""}
<main><div class="wrap">
${hero ? "" : crumbHtml}
${body}
</div></main>
${locale ? locale.footer() : footerHtml()}
<script type="module" src="${ASSETS}/nav.js"></script>
</body>
</html>
`;
}

/**
 * Tables with a header row and 4+ columns get data-label attributes and a "stack" class, so on
 * phones each row can be shown as a small card ("Gross pay  $3,269.23") instead of a wide table.
 */
function stackTables(html) {
  return html.replace(/<table>([\s\S]*?)<\/table>/g, (whole, inner) => {
    const head = inner.match(/<thead>([\s\S]*?)<\/thead>/);
    if (!head) return whole;
    const labels = [...head[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
    if (labels.length < 4) return whole;
    const body = inner.replace(/<tr([^>]*)>([\s\S]*?)<\/tr>/g, (row, attrs, cells) => {
      if (cells.includes("<th")) return row;
      let i = 0;
      return `<tr${attrs}>${cells.replace(/<td([^>]*)>/g, (td, a) => `<td${a} data-label="${esc(labels[i++] ?? "")}">`)}</tr>`;
    });
    return `<table class="stack">${body}</table>`;
  });
}

function write(path, html) {
  html = stackTables(html);
  const file = new URL("." + (path.endsWith("/") ? path + "index.html" : path), out);
  mkdirSync(new URL(".", file), { recursive: true });
  writeFileSync(file, html);
  pages.push(path);
}
const pages = [];

function periodTable(amounts, opts, caption, annualCents) {
  const rows = PERIODS.map(([p, label, n]) => ({ label, n, ...payRow(amounts[p], p, opts) }));
  const body = rows.map((r) => `<tr><td>${r.label}</td><td>${fmt(r.gross)}</td><td>${fmt(r.tax)}</td><td><strong>${fmt(r.net)}</strong></td><td>${fmt(r.superC)}</td></tr>`).join("");
  const fortnight = rows[1];
  const grossYear = annualCents ?? fortnight.gross * 26;
  const taxYear = fortnight.tax * 26;
  const yearRow = `<tr class="total"><td>Year (paid fortnightly)</td><td>${fmt(grossYear)}</td><td>${fmt(taxYear)}</td><td>${fmt(grossYear - taxYear)}</td><td>${fmt(Math.round((grossYear * SUPER_PER_MILLE) / 1000))}</td></tr>`;
  return { html: `<div class="table-scroll"><table><caption>${esc(caption)}</caption><thead><tr><th scope="col">Pay period</th><th scope="col">Gross pay</th><th scope="col">Tax withheld</th><th scope="col">Take-home pay</th><th scope="col">Super</th></tr></thead><tbody>${body}${yearRow}</tbody></table></div>`, rows };
}

/** Horizontal bar splitting gross pay into take-home and tax, with super shown alongside. */
function splitBar(grossC, taxC, superC) {
  const netPct = grossC ? Math.round(((grossC - taxC) / grossC) * 1000) / 10 : 0;
  const taxPct = Math.round((100 - netPct) * 10) / 10;
  return `<div class="split" role="img" aria-label="Take-home pay is ${netPct}% of gross pay and tax withheld is ${taxPct}%">
<span class="seg seg-net" style="width:${netPct}%"></span><span class="seg seg-tax" style="width:${taxPct}%"></span></div>
<ul class="legend"><li><i class="dot dot-net"></i>Take-home ${netPct}%</li><li><i class="dot dot-tax"></i>Tax withheld ${taxPct}%</li><li><i class="dot dot-super"></i>Plus super ${fmt(superC)}</li></ul>`;
}

/** Four summary figures (week, fortnight, month, year) for a salary or hourly page. */
function summaryCards(rows, yearNetC) {
  const [w, f, m] = rows;
  const card = (label, value, cls = "") => `<div class="sum-card${cls}"><span>${label}</span><strong>${value}</strong></div>`;
  return `<div class="summary">${card("Take-home a week", fmt(w.net))}${card("A fortnight", fmt(f.net), " sum-card-main")}${card("A month", fmt(m.net))}${card("A year", fmt(yearNetC))}</div>`;
}

/** Page-level tax year tabs. The choice updates the heading, the header badge and the calculator. */
function yearTabs() {
  const years = [["2025-26", "2025–26", "last year"], ["2026-27", "2026–27", "this year"], ["2027-28", "2027–28", "estimate"]];
  return `<div class="year-bar"><span class="year-bar-label" id="year-label">Tax year</span>${tip("year")}
<div class="year-tabs" role="radiogroup" aria-labelledby="year-label">${years.map(([v, label, note]) =>
    `<label><input type="radio" name="year" value="${v}"${v === "2026-27" ? " checked" : ""}><span>${label}<small>${note}</small></span></label>`).join("")}</div></div>
<script type="module" src="${ASSETS}/year.js"></script>`;
}

const HELP = {
 "h-income": "Your taxable income plus any reportable fringe benefits, reportable super contributions, net investment losses and exempt foreign employment income. For most employees it's just taxable income.",
 "amount": "Your gross pay: what you earn before tax is taken out. Enter a yearly salary, the amount for one pay, or your hourly rate.",
 "basis": "Is the amount above a yearly salary, the amount for one pay, or an hourly rate?",
 "period": "How often your employer pays you. Tax is worked out on each pay, so this changes what you see on each payslip.",
 "hours": "How many hours you work in a normal week. Full time is usually 38.",
 "super": "Some jobs quote a total package that includes the 12% super your employer pays into your super fund. Choose Yes if your amount includes super and we'll split it into pay and super.",
 "tft": "The first $18,200 you earn each year is tax-free. You normally claim it from one employer only, your main job. Choose Not claiming for a second job.",
 "tfn": "Your tax file number. If you haven't given it to your employer, they must take 47% tax from your pay until you do.",
 "residency": "Whether you're an Australian resident for tax purposes. It isn't the same as citizenship or your visa. Foreign residents pay different rates and can't claim the tax-free threshold.",
 "ot-hours": "Hours worked on top of your normal hours in this pay.",
 "ot-mult": "Overtime is usually paid at a higher rate. Time and a half is 1.5 times your normal hourly rate; double time is 2 times. Check your award or contract.",
 "ot-rate": "Your normal hourly rate. Leave it blank and we'll work it out from your pay, assuming a 38-hour week.",
 "bonus": "A one-off payment such as a bonus or commission paid with this pay. Your employer takes tax from it using the ATO's method for bonuses.",
 "ml-spouse": "Choose Yes if you have a spouse (married or de facto) and have claimed a Medicare levy reduction on a Medicare levy variation declaration with your employer.",
 "children": "Children you support who are under 21, or full-time students under 25.",
 "seniors": "The seniors and pensioners tax offset (SAPTO) lowers tax for people who have reached age pension age or get certain government pensions. If you've claimed it with your employer, pick your situation. Illness-separated means you and your spouse live apart because of illness or because one of you is in aged care.",
 "r-salary": "Your total salary or wages for the year before tax. Don't include super, unless your salary is a package that includes it.",
 "r-period": "How often you're paid. We use it to work out how much tax your employer takes out over the year.",
 "r-overtime": "Your total overtime pay for the year. It's taxed like the rest of your pay but usually doesn't attract super.",
 "r-bonus": "Your total bonuses or commissions for the year.",
 "r-other": "Income with no tax taken out, such as bank interest or side work. It's added to your taxable income, which can mean a tax bill.",
 "r-deductions": "Work-related expenses you'd claim, such as tools, uniforms, work travel and working from home. From 2026–27 you get a $1,000 standard deduction automatically, so only enter these if they add up to more than $1,000.",
 "r-otherded": "Deductions that aren't work expenses, such as donations to charity and tax agent fees. These are claimed on top of the standard deduction.",
 "r-help": "Do you have a HELP, VSL or other study or training loan? Once your income passes the repayment threshold ($69,528 in 2026–27), you repay part of it through your tax.",
 "r-cover": "Private health insurance that includes hospital cover. Without it, singles earning over $105,000 (2026–27) pay the Medicare levy surcharge of 1% to 1.5% of their income.",
 "r-family": "Couples and sole parents can pay less Medicare levy when family income is low, and get higher Medicare levy surcharge thresholds.",
 "r-spouse": "Your spouse's taxable income for the year. It's used for the family Medicare levy and surcharge tests.",
 "r-sapto": "The seniors and pensioners tax offset (SAPTO) lowers tax for people who have reached age pension age or get certain pensions. Worth up to $2,230 for singles and $1,602 each for couples.",
 "year": "The financial year runs from 1 July to 30 June. 2027–28 is an estimate until the ATO publishes its tables."
};

let tipCount = 0;
/** A small "?" button that shows a plain-English explanation on hover, focus or tap. */
function tip(key) {
  const text = HELP[key];
  if (!text) throw new Error(`no help text for ${key}`);
  const id = `tip-${++tipCount}`;
  return `<span class="tip"><button type="button" class="tip-btn" aria-label="What does this mean?" aria-describedby="${id}">?</button><span class="tip-text" role="tooltip" id="${id}">${esc(text)}</span></span>`;
}

/** A row of toggle buttons (radio inputs) instead of a native dropdown. */
function segmented(name, legend, options, selected, wide = false, help = name) {
  return `<fieldset class="field seg-field${wide ? " wide" : ""}"><legend>${esc(legend)}${HELP[help] ? tip(help) : ""}</legend><div class="segmented">${options.map(([value, label]) =>
    `<label><input type="radio" name="${name}" value="${value}"${value === selected ? " checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div></fieldset>`;
}

function calculatorForm({ basis = "year", amount = "", period = "fortnightly" } = {}) {
  return `<form class="calc" id="calc" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
<label class="field wide"><span>Your pay before tax${tip("amount")}</span>
<span class="money-input"><span aria-hidden="true">$</span><input id="amount" inputmode="decimal" autocomplete="off" placeholder="85,000" value="${esc(amount)}" aria-describedby="amount-error"></span>
<span class="error" id="amount-error" role="alert"></span></label>
${segmented("basis", "This amount is per", [["year", "Year"], ["pay", "Pay period"], ["hour", "Hour"]], basis, true)}
${segmented("period", "I'm paid", [["weekly", "Weekly"], ["fortnightly", "Fortnightly"], ["monthly", "Monthly"]], period, true)}
<label class="field wide" id="hours-field" hidden><span>Hours a week${tip("hours")}</span>
<input id="hours" inputmode="decimal" value="38"></label>
${segmented("super", "Amount includes super", [["no", "No"], ["yes", "Yes"]], "no")}
${segmented("tft", "Tax-free threshold", [["yes", "Claiming"], ["no", "Not claiming"]], "yes")}
${segmented("tfn", "TFN given to employer", [["yes", "Yes"], ["no", "No"]], "yes")}
${segmented("residency", "Residency for tax", [["resident", "Resident"], ["foreign", "Foreign"]], "resident")}
<details class="extras wide"><summary>Add overtime or a bonus</summary>
<div class="calc-grid">
<label class="field"><span>Overtime hours this pay${tip("ot-hours")}</span><input id="ot-hours" inputmode="decimal" autocomplete="off" placeholder="0"></label>
${segmented("ot-mult", "Overtime rate", [["1.5", "Time and a half"], ["2", "Double time"]], "1.5")}
<label class="field"><span>Hourly rate for overtime${tip("ot-rate")}</span><input id="ot-rate" inputmode="decimal" autocomplete="off"></label>
<label class="field"><span>Bonus paid this pay${tip("bonus")}</span><span class="money-input small"><span aria-hidden="true">$</span><input id="bonus" inputmode="decimal" autocomplete="off" placeholder="0"></span></label>
</div>
<span class="error" id="extras-error" role="alert"></span>
</details>
<details class="extras wide"><summary>Medicare levy reduction for a spouse or children</summary>
<p class="note" style="margin:0 0 12px">Only applies if you've given your employer a Medicare levy variation declaration because your family income is low. It reduces the tax taken from each pay.</p>
<div class="calc-grid">
${segmented("ml-spouse", "Spouse", [["no", "No"], ["yes", "Yes"]], "no")}
<label class="field"><span>Dependent children${tip("children")}</span><input id="ml-children" inputmode="numeric" autocomplete="off" placeholder="0"></label>
</div>
</details>
<details class="extras wide"><summary>Senior or pensioner (SAPTO)</summary>
${segmented("seniors", "Claiming the seniors and pensioners tax offset", [["no", "No"], ["single", "Single"], ["couple", "Couple"], ["illness-separated", "Illness-separated"]], "no", true)}
</details>
</div>
</div>
<div class="calc-result" aria-live="polite">
<div id="result-empty" class="result-empty"><p class="kicker">Your take-home pay</p><p class="big muted">$0.00</p><p class="sub">Enter your pay to see what lands in your account, the tax withheld and your super.</p></div>
<div id="result" hidden>
<p class="kicker" id="net-label">Take-home pay</p>
<p class="big" id="net"></p>
<div id="split"></div>
<div class="table-scroll"><table class="compact"><thead><tr><th scope="col"></th><th scope="col">Per pay</th><th scope="col">Per year</th></tr></thead><tbody id="rows"></tbody></table></div>
<p class="note" id="calc-note"></p>
</div>
</div>
<noscript><p class="note">The calculator needs JavaScript. You can still look up any amount on the <a href="/salary/">salary</a> and <a href="/hourly/">hourly rate</a> pages.</p></noscript>
</form>
<script type="module" src="${ASSETS}/app.js"></script>
<script type="module" src="${ASSETS}/tips.js"></script>`;
}

/** "Your tax for the year" block for a salary page: tax payable, offsets, levy and refund estimate. */
function yearTaxSection(salary, payFrequency = "fortnightly") {
  const r = estimateAnnualTax({ salary, payFrequency });
  const help = estimateAnnualTax({ salary, studyLoan: true, payFrequency });
  const payWord = { weekly: ["52 weekly pays", "week"], fortnightly: ["26 fortnightly pays", "fortnight"], monthly: ["12 monthly pays", "month"] }[payFrequency];
  const c = r.cents;
  const refund = c.refund >= 0;
  const rows = [
    ...(r.standardDeductionUsed ? [["Standard deduction for work expenses", `−${fmt(r.workDeductions * 100)}`], ["Taxable income", fmt(r.taxableIncome * 100)]] : []),
    ["Income tax", fmt(c.grossTax)],
    ["Low income tax offset", c.lito ? `−${fmt(c.lito)}` : fmt(0)],
    ["Medicare levy (2%)", fmt(c.medicare)],
  ];
  const helpLine = help.cents.studyLoan > 0
    ? `<p>With a HELP or other study loan, you'd also repay ${fmt(help.cents.studyLoan)} this year, and your employer withholds about ${fmt((help.perPayWithholding - r.perPayWithholding) * 100)} extra each ${payWord[1]} to cover it.</p>`
    : `<p>With a HELP or other study loan, you wouldn't make a compulsory repayment on this income: repayments start at $69,528 in ${YEAR_LABEL}.</p>`;
  return `<h2>Your tax for the year on ${fmt0(salary)}</h2>
<p>The amounts above are what your employer takes out of each pay. Here's the tax you actually owe for ${YEAR_LABEL} on a ${fmt0(salary)} salary with no other income, after the $1,000 standard deduction for work expenses that applies from ${YEAR_LABEL}, and how it compares.</p>
<div class="table-scroll"><table><tbody>${rows.map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join("")}
<tr class="total"><td>Tax for the year</td><td>${fmt(c.totalLiability)}</td></tr>
<tr><td>Tax withheld (${payWord[0]})</td><td>${fmt(c.withheld)}</td></tr>
<tr class="total"><td>${refund ? "Estimated refund" : "Estimated amount owing"}</td><td>${fmt(Math.abs(c.refund))}</td></tr></tbody></table></div>
${helpLine}
<p>Have deductions, other income or no private health cover? <a href="/tax-refund-calculator/">Estimate your refund</a> with your own details.</p>`;
}

/** "If $X includes super" block: the same package split into pay and super. */
function packageSection(pkg) {
  const p = splitPackage(pkg);
  const amounts = fromAnnual(p.salary);
  const rows = PERIODS.map(([period, label]) => {
    const r = payRow(amounts[period], period);
    return `<tr><td>${label}</td><td>${fmt(r.gross)}</td><td>${fmt(r.tax)}</td><td><strong>${fmt(r.net)}</strong></td></tr>`;
  }).join("");
  const f = payRow(amounts.fortnightly, "fortnightly");
  return `<h2>If ${fmt0(pkg)} includes super</h2>
<p>Some jobs advertise a total package that includes super. A ${fmt0(pkg)} package is ${fmt(p.salaryCents)} in pay plus ${fmt(p.superCents)} super (12%), so you take home <strong>${fmt(f.net)}</strong> a fortnight.</p>
<div class="table-scroll"><table><caption>${fmt0(pkg)} package including super</caption><thead><tr><th scope="col">Pay period</th><th scope="col">Pay (excluding super)</th><th scope="col">Tax withheld</th><th scope="col">Take-home pay</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function refundCalculatorForm() {
  const money = (id, label, placeholder, { small = false } = {}) => `<label class="field${small ? "" : " wide"}"${id === "r-spouse" ? ' id="r-spouse-field"' : ""}><span>${label}${HELP[id] ? tip(id) : ""}</span>
<span class="money-input${small ? " small" : ""}"><span aria-hidden="true">$</span><input id="${id}" inputmode="decimal" autocomplete="off" placeholder="${placeholder}" aria-describedby="${id}-error"></span>
<span class="error" id="${id}-error" role="alert"></span></label>`;
  return `<form class="calc" id="refund" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
${money("r-salary", "Salary or wages for the year", "85,000")}
${segmented("r-period", "Paid", [["weekly", "Weekly"], ["fortnightly", "Fortnightly"], ["monthly", "Monthly"]], "fortnightly")}
${segmented("r-super", "Salary includes super", [["no", "No"], ["yes", "Yes, a package"]], "no", false, "super")}
</div>
<h2 class="form-section">Other income and deductions <span class="hint">optional</span></h2>
<div class="calc-grid">
${money("r-overtime", "Overtime", "0", { small: true })}
${money("r-bonus", "Bonuses", "0", { small: true })}
${money("r-other", "Other income", "0", { small: true })}
${money("r-deductions", "Work expenses", "0", { small: true })}
${money("r-otherded", "Other deductions", "0", { small: true })}
</div>
<h2 class="form-section">Your situation</h2>
<div class="calc-grid">
${segmented("r-help", "HELP or study loan", [["no", "No"], ["yes", "Yes"]], "no")}
${segmented("r-cover", "Private hospital cover", [["yes", "Yes"], ["no", "No"]], "yes")}
${segmented("r-tft", "Tax-free threshold", [["yes", "Claiming"], ["no", "Not claiming"]], "yes", false, "tft")}
${segmented("r-residency", "Residency for tax", [["resident", "Resident"], ["foreign", "Foreign"]], "resident", false, "residency")}
${segmented("r-family", "Family", [["single", "Single"], ["couple", "Couple"], ["sole", "Sole parent"]], "single")}
${segmented("r-sapto", "Senior or pensioner", [["no", "No"], ["yes", "Yes"]], "no")}
<div class="calc-grid wide" id="r-family-fields" hidden>
${money("r-spouse", "Spouse's taxable income", "0", { small: true })}
<label class="field"><span>Dependent children${tip("children")}</span><input id="r-children" inputmode="numeric" autocomplete="off" placeholder="0"><span class="error" id="r-children-error" role="alert"></span></label>
</div>
</div>
</div>
<div class="calc-result" aria-live="polite">
<div id="r-empty"><p class="kicker">Estimated tax refund</p><p class="big muted">$0.00</p><p class="sub">Enter your salary to estimate your refund or bill for ${YEAR_LABEL}.</p></div>
<div id="r-result" hidden>
<p class="kicker" id="r-label">Estimated tax refund</p>
<p class="big" id="r-big"></p>
<div class="table-scroll"><table class="compact"><tbody id="r-rows"></tbody></table></div>
<p class="note" id="r-note"></p>
</div></div>
<noscript><p class="note">The calculator needs JavaScript. Each <a href="/salary/">salary page</a> shows the tax for the year without it.</p></noscript>
</form>
<script type="module" src="${ASSETS}/refund.js"></script>
<script type="module" src="${ASSETS}/tips.js"></script>`;
}

// ---------- salary pages ----------
const SALARIES = [];
for (let s = 20000; s <= 250000; s += 1000) SALARIES.push(s);
for (let s = 260000; s <= 500000; s += 10000) SALARIES.push(s);
const POPULAR = [45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000, 110000, 120000, 130000, 150000];

function salaryPage(salary, i) {
  const amounts = fromAnnual(salary);
  const annualCents = salary * 100;
  const main = periodTable(amounts, {}, "Main job, tax-free threshold claimed", annualCents);
  const second = periodTable(amounts, { taxFreeThreshold: false }, "Second job, no tax-free threshold", annualCents);
  const foreign = periodTable(amounts, { foreignResident: true }, "Foreign resident for tax", annualCents);
  const f = main.rows[1];
  const w = main.rows[0];
  const m = main.rows[2];
  const yearlyTax = f.tax * 26;
  const pct = ((yearlyTax / (salary * 100)) * 100).toFixed(1);
  const hourly = (salary / 52 / 38).toFixed(2);
  const path = `/salary/${salary}/`;
  const title = `${fmt0(salary)} after tax in Australia (${YEAR_LABEL}) – take-home pay`;
  const description = `On a ${fmt0(salary)} salary you take home ${fmt(f.net)} a fortnight (${fmt(w.net)} a week, ${fmt(m.net)} a month) after tax withheld in ${YEAR_LABEL}. Plus ${fmt(f.superC)} super each fortnight.`;
  const prev = SALARIES[i - 1], next = SALARIES[i + 1];
  const nearby = SALARIES.filter((s) => Math.abs(s - salary) <= 10000 && s !== salary && s % 5000 === 0);
  const hourlyLink = Math.round(salary / 52 / 38);
  const hero = `<h1>${fmt0(salary)} a year after tax</h1>
<p class="intro">If you earn ${fmt0(salary)} a year in Australia, your employer withholds ${fmt(f.tax)} in tax each fortnight, so you take home <strong>${fmt(f.net)}</strong> a fortnight. That's ${fmt(w.net)} a week or ${fmt(m.net)} a month, based on ${YEAR_LABEL} tax rates.</p>
${summaryCards(main.rows, annualCents - yearlyTax)}
${splitBar(annualCents, yearlyTax, Math.round((annualCents * SUPER_PER_MILLE) / 1000))}
<p class="updated">Main job, tax-free threshold claimed. Updated ${UPDATED} for pays from 1 July 2026.</p>`;
  const body = `<h2>Breakdown by pay period</h2>
${main.html}
<p>Over a year of fortnightly pays that is ${fmt(yearlyTax)} withheld, about ${pct}% of your salary. Your employer also pays ${fmt(Math.round((annualCents * SUPER_PER_MILLE) / 1000))} a year into your super fund (12% of your salary), on top of your pay. A ${fmt0(salary)} salary works out to about $${hourly} an hour for a 38-hour week.</p>
${adSlot("salary-after-breakdown")}
${yearTaxSection(salary)}
${packageSection(salary)}
${adSlot("salary-mid")}
<h2>If this is your second job</h2>
<p>You can usually only claim the tax-free threshold from one employer. If this salary comes from a second job, more tax is withheld: ${fmt(second.rows[1].tax)} a fortnight instead of ${fmt(f.tax)}.</p>
${second.html}
<h2>If you're a foreign resident</h2>
<p>Foreign residents for tax can't claim the tax-free threshold and don't pay the Medicare levy, so a different scale applies.</p>
${foreign.html}
<h2>Check a different situation</h2>
<p>Paid a different way, or not sure about the tax-free threshold? Use the calculator with your exact details.</p>
${calculatorForm({ basis: "year", amount: String(salary) })}
<div class="box"><p><strong>Tax withheld isn't your final tax.</strong> These amounts are what your employer takes out of each pay. When you lodge your tax return, your actual tax is worked out and you may get a refund or have a bill, for example if you have deductions, a HELP debt or more than one job.</p></div>
${adSlot("salary-end")}
<h2>Nearby salaries</h2>
<ul class="links">${nearby.map((s) => `<li><a href="/salary/${s}/">${fmt0(s)} after tax</a></li>`).join("")}${hourlyLink >= 20 && hourlyLink <= 80 ? `<li><a href="/hourly/${hourlyLink}/">$${hourlyLink} an hour after tax</a></li>` : ""}</ul>
<nav class="pager" aria-label="More salaries">${prev ? `<a href="/salary/${prev}/">← ${fmt0(prev)} after tax</a>` : "<span></span>"}${next ? `<a href="/salary/${next}/">${fmt0(next)} after tax →</a>` : "<span></span>"}</nav>`;
  write(path, layout({ path, title, description, hero, body, crumbs: [{ name: "Salaries", path: "/salary/" }, { name: `${fmt0(salary)} after tax`, path }] }));
}
SALARIES.forEach(salaryPage);

// salary index
{
  const path = "/salary/";
  const rows = SALARIES.filter((s) => s % 5000 === 0).map((s) => {
    const f = payRow(fromAnnual(s).fortnightly, "fortnightly");
    return `<tr><td><a href="/salary/${s}/">${fmt0(s)}</a></td><td>${fmt(f.tax)}</td><td>${fmt(f.net)}</td><td>${fmt(f.net * 26)}</td></tr>`;
  }).join("");
  const bands = [[20000, 49000], [50000, 79000], [80000, 109000], [110000, 139000], [140000, 179000], [180000, 250000], [260000, 500000]];
  const body = `<h1>Salary after tax: every amount from $20,000 to $500,000</h1>
<p class="intro">Take-home pay after tax withheld for full-time salaries in ${YEAR_LABEL}, assuming you claim the tax-free threshold. Pick your salary for weekly, fortnightly and monthly figures, second-job amounts and foreign resident rates.</p>
${adSlot("salary-index")}
<div class="table-scroll"><table><caption>Fortnightly pay by salary (main job, tax-free threshold claimed)</caption><thead><tr><th scope="col">Salary</th><th scope="col">Tax withheld per fortnight</th><th scope="col">Take-home per fortnight</th><th scope="col">Take-home per year</th></tr></thead><tbody>${rows}</tbody></table></div>
${bands.map(([a, b]) => `<h2>${fmt0(a)} to ${fmt0(b)}</h2><ul class="links">${SALARIES.filter((s) => s >= a && s <= b).map((s) => `<li><a href="/salary/${s}/">${fmt0(s)}</a></li>`).join("")}</ul>`).join("")}`;
  write(path, layout({ path, title: `Salary after tax in Australia (${YEAR_LABEL}): $20,000 to $500,000`, description: `Take-home pay for every salary from $20,000 to $500,000 in ${YEAR_LABEL}: weekly, fortnightly and monthly pay after tax withheld, plus super.`, body, crumbs: [{ name: "Salaries", path }] }));
}

// ---------- hourly pages ----------
const RATES = [];
for (let r = 20; r <= 100; r++) RATES.push(r);
const HOURS = [15, 20, 25, 30, 38];

function hourlyPage(rate, i) {
  const full = fromHourly(rate, 38);
  const main = periodTable(full, {}, "Full time (38 hours a week), tax-free threshold claimed");
  const w = main.rows[0];
  const f = main.rows[1];
  const annual = rate * 38 * 52;
  const hoursRows = HOURS.map((h) => {
    const wk = payRow(fromHourly(rate, h).weekly, "weekly");
    return `<tr><td>${h} hours</td><td>${fmt(wk.gross)}</td><td>${fmt(wk.tax)}</td><td><strong>${fmt(wk.net)}</strong></td></tr>`;
  }).join("");
  const second = payRow(fromHourly(rate, 20).weekly, "weekly", { taxFreeThreshold: false });
  const path = `/hourly/${rate}/`;
  const title = `$${rate} an hour after tax in Australia (${YEAR_LABEL})`;
  const description = `At $${rate} an hour, full time, you take home ${fmt(w.net)} a week (${fmt(f.net)} a fortnight) after tax withheld in ${YEAR_LABEL}. Part-time amounts for 15 to 30 hours too.`;
  const prev = RATES[i - 1], next = RATES[i + 1];
  const salaryLink = Math.round(annual / 1000) * 1000;
  const hero = `<h1>$${rate} an hour after tax</h1>
<p class="intro">Working full time at $${rate} an hour (38 hours a week) you earn ${fmt(w.gross)} a week before tax. After tax withheld you take home <strong>${fmt(w.net)}</strong> a week, or ${fmt(f.net)} a fortnight, based on ${YEAR_LABEL} rates.</p>
${summaryCards(main.rows, (f.gross - f.tax) * 26)}
${splitBar(w.gross, w.tax, w.superC * 52)}
<p class="updated">Full time, tax-free threshold claimed. Updated ${UPDATED} for pays from 1 July 2026.</p>`;
  const body = `<h2>Breakdown by pay period</h2>
${main.html}
<p>That's about ${fmt0(annual)} a year before tax. Your employer also pays 12% super on top: ${fmt(w.superC)} a week.</p>
${adSlot("hourly-after-breakdown")}
<h2>Part-time and casual hours at $${rate} an hour</h2>
<p>Weekly pay after tax withheld at different hours, claiming the tax-free threshold.</p>
<div class="table-scroll"><table><thead><tr><th scope="col">Hours a week</th><th scope="col">Gross pay</th><th scope="col">Tax withheld</th><th scope="col">Take-home pay</th></tr></thead><tbody>${hoursRows}</tbody></table></div>
<p>If this is a second job where you don't claim the tax-free threshold, 20 hours a week has ${fmt(second.tax)} withheld instead, leaving ${fmt(second.net)}. Casual rates usually include a 25% loading; enter your actual hourly rate including any loading.</p>
${calculatorForm({ basis: "hour", amount: String(rate) })}
${adSlot("hourly-end")}
<h2>Similar rates</h2>
<ul class="links">${RATES.filter((r) => Math.abs(r - rate) <= 5 && r !== rate).map((r) => `<li><a href="/hourly/${r}/">$${r} an hour</a></li>`).join("")}${salaryLink >= 20000 && salaryLink <= 250000 ? `<li><a href="/salary/${salaryLink}/">${fmt0(salaryLink)} a year</a></li>` : ""}</ul>
<nav class="pager" aria-label="More hourly rates">${prev ? `<a href="/hourly/${prev}/">← $${prev} an hour</a>` : "<span></span>"}${next ? `<a href="/hourly/${next}/">$${next} an hour →</a>` : "<span></span>"}</nav>`;
  write(path, layout({ path, title, description, hero, body, crumbs: [{ name: "Hourly rates", path: "/hourly/" }, { name: `$${rate} an hour`, path }] }));
}
RATES.forEach(hourlyPage);

{
  const path = "/hourly/";
  const rows = RATES.map((r) => {
    const w = payRow(fromHourly(r, 38).weekly, "weekly");
    return `<tr><td><a href="/hourly/${r}/">$${r}</a></td><td>${fmt(w.gross)}</td><td>${fmt(w.tax)}</td><td>${fmt(w.net)}</td></tr>`;
  }).join("");
  const body = `<h1>Hourly rate after tax: $20 to $100 an hour</h1>
<p class="intro">Weekly take-home pay for full-time work (38 hours) at each hourly rate in ${YEAR_LABEL}, claiming the tax-free threshold. Open a rate for fortnightly, monthly and part-time figures.</p>
${adSlot("hourly-index")}
<div class="table-scroll"><table><thead><tr><th scope="col">Hourly rate</th><th scope="col">Weekly gross</th><th scope="col">Tax withheld</th><th scope="col">Weekly take-home</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  write(path, layout({ path, title: `Hourly rate after tax in Australia (${YEAR_LABEL}): $20 to $100 an hour`, description: `Weekly take-home pay after tax for every hourly rate from $20 to $100 in ${YEAR_LABEL}, full time and part time.`, body, crumbs: [{ name: "Hourly rates", path }] }));
}

// ---------- weekly and fortnightly pay pages ----------
const WEEKLY = [];
for (let a = 300; a <= 3000; a += 50) WEEKLY.push(a);
const FORTNIGHTLY = [];
for (let a = 1000; a <= 6000; a += 100) FORTNIGHTLY.push(a);
const PAY_KINDS = {
  weekly: { list: WEEKLY, word: "a week", per: "week", n: 52, crumb: "Weekly pay", label: "Weekly" },
  fortnightly: { list: FORTNIGHTLY, word: "a fortnight", per: "fortnight", n: 26, crumb: "Fortnightly pay", label: "Fortnightly" },
};
const amountsFor = (kind, amount) => {
  const c = amount * 100;
  return kind === "weekly"
    ? { weekly: c, fortnightly: c * 2, monthly: Math.round((c * 52) / 12) }
    : { weekly: Math.round(c / 2), fortnightly: c, monthly: Math.round((c * 26) / 12) };
};
/** Salary page for an annual amount, if one exists. */
const salaryPageFor = (annual) => {
  const near = annual <= 250000 ? Math.round(annual / 1000) * 1000 : Math.round(annual / 10000) * 10000;
  return SALARIES.includes(near) ? near : null;
};

function payPeriodPage(kind, amount, i) {
  const K = PAY_KINDS[kind];
  const amounts = amountsFor(kind, amount);
  const rows = PERIODS.map(([p, label]) => ({ label, ...payRow(amounts[p], p) }));
  const own = rows.find((r) => r.label.toLowerCase() === K.per);
  const yearGross = amount * 100 * K.n;
  const yearTax = own.tax * K.n;
  const table = `<div class="table-scroll"><table><caption>Main job, tax-free threshold claimed</caption><thead><tr><th scope="col">Pay period</th><th scope="col">Gross pay</th><th scope="col">Tax withheld</th><th scope="col">Take-home pay</th><th scope="col">Super</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.label}</td><td>${fmt(r.gross)}</td><td>${fmt(r.tax)}</td><td><strong>${fmt(r.net)}</strong></td><td>${fmt(r.superC)}</td></tr>`).join("")}<tr class="total"><td>Year (paid ${kind})</td><td>${fmt(yearGross)}</td><td>${fmt(yearTax)}</td><td>${fmt(yearGross - yearTax)}</td><td>${fmt(Math.round((yearGross * SUPER_PER_MILLE) / 1000))}</td></tr></tbody></table></div>`;
  const situations = [
    ["Main job (tax-free threshold claimed)", {}],
    ["Second job (no tax-free threshold)", { taxFreeThreshold: false }],
    ["With a HELP or study loan", { studyLoan: true }],
    ["Foreign resident", { foreignResident: true }],
    ["No TFN given", { tfnProvided: false }],
  ].map(([label, opts]) => {
    const r = payRow(amounts[kind], kind, opts);
    return `<tr><td>${label}</td><td>${fmt(r.tax)}</td><td><strong>${fmt(r.net)}</strong></td></tr>`;
  }).join("");
  const annual = amount * K.n;
  const salaryLink = salaryPageFor(annual);
  const hourly = (annual / 52 / 38).toFixed(2);
  const path = `/${kind}/${amount}/`;
  const title = `${fmt0(amount)} ${K.word} after tax in Australia (${YEAR_LABEL})`;
  const description = `On ${fmt0(amount)} ${K.word} before tax you take home ${fmt(own.net)} ${K.word} after tax withheld in ${YEAR_LABEL}. Second job, HELP and foreign resident amounts too.`;
  const prev = K.list[i - 1], next = K.list[i + 1];
  const hero = `<h1>${fmt0(amount)} ${K.word} after tax</h1>
<p class="intro">If you're paid ${fmt0(amount)} ${K.word} before tax in Australia, your employer withholds ${fmt(own.tax)} in tax, so you take home <strong>${fmt(own.net)}</strong> ${K.word}. That's about ${fmt(yearGross - yearTax)} a year, based on ${YEAR_LABEL} tax rates.</p>
${summaryCards(rows, yearGross - yearTax)}
${splitBar(own.gross, own.tax, own.superC)}
<p class="updated">Main job, tax-free threshold claimed. Updated ${UPDATED} for pays from 1 July 2026.</p>`;
  const body = `<h2>Breakdown by pay period</h2>
${table}
<p>${fmt0(amount)} ${K.word} is ${fmt0(annual)} a year${salaryLink ? ` (see <a href="/salary/${salaryLink}/">${fmt0(salaryLink)} after tax</a>)` : ""}, or about $${hourly} an hour for a 38-hour week. Your employer also pays 12% super on top: ${fmt(own.superC)} ${K.word}.</p>
${adSlot(`${kind}-after-breakdown`)}
<h2>Tax on ${fmt0(amount)} ${K.word} in other situations</h2>
<div class="table-scroll"><table><thead><tr><th scope="col">Situation</th><th scope="col">Tax withheld</th><th scope="col">Take-home ${K.word}</th></tr></thead><tbody>${situations}</tbody></table></div>
${calculatorForm({ basis: "pay", amount: String(amount), period: kind })}
${yearTaxSection(annual, kind)}
<div class="box"><p><strong>Tax withheld isn't your final tax.</strong> These amounts are what your employer takes out of each pay. When you lodge your tax return, your actual tax is worked out and you may get a refund or have a bill.</p></div>
${adSlot(`${kind}-end`)}
<h2>Nearby amounts</h2>
<ul class="links">${K.list.filter((a) => Math.abs(K.list.indexOf(a) - i) <= 4 && a !== amount).map((a) => `<li><a href="/${kind}/${a}/">${fmt0(a)} ${K.word}</a></li>`).join("")}</ul>
<nav class="pager" aria-label="More amounts">${prev ? `<a href="/${kind}/${prev}/">← ${fmt0(prev)} ${K.word}</a>` : "<span></span>"}${next ? `<a href="/${kind}/${next}/">${fmt0(next)} ${K.word} →</a>` : "<span></span>"}</nav>`;
  write(path, layout({ path, title, description, hero, body, crumbs: [{ name: K.crumb, path: `/${kind}/` }, { name: `${fmt0(amount)} ${K.word}`, path }] }));
}
for (const kind of Object.keys(PAY_KINDS)) {
  const K = PAY_KINDS[kind];
  K.list.forEach((a, i) => payPeriodPage(kind, a, i));
  const path = `/${kind}/`;
  const rows = K.list.map((a) => {
    const r = payRow(a * 100, kind);
    return `<tr><td><a href="/${kind}/${a}/">${fmt0(a)}</a></td><td>${fmt(r.tax)}</td><td>${fmt(r.net)}</td><td>${fmt(r.net * K.n)}</td></tr>`;
  }).join("");
  const range = `${fmt0(K.list[0])} to ${fmt0(K.list[K.list.length - 1])}`;
  const body = `<h1>${K.label} pay after tax: ${range} ${K.word}</h1>
<p class="intro">Take-home pay after tax withheld for every ${kind} amount from ${range} in ${YEAR_LABEL}, claiming the tax-free threshold. Open an amount for second-job, HELP and foreign resident figures.</p>
${adSlot(`${kind}-index`)}
<div class="table-scroll"><table><thead><tr><th scope="col">Gross ${K.word}</th><th scope="col">Tax withheld</th><th scope="col">Take-home ${K.word}</th><th scope="col">Take-home a year</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  write(path, layout({ path, title: `${K.label} pay after tax in Australia (${YEAR_LABEL}): ${range}`, description: `Take-home pay for every ${kind} amount from ${range} in ${YEAR_LABEL}: tax withheld, take-home pay and the yearly total.`, body, crumbs: [{ name: K.crumb, path }] }));
}

// ---------- tax rates ----------
{
  const path = "/tax-rates/";
  const ids = ["2025-26", "2026-27", "2027-28"];
  const label = (id) => ANNUAL_YEARS[id].label;
  const bracketRows = (list) => list.map((b, i) => {
    const from = b.over === 0 ? 0 : b.over + 1;
    const to = list[i + 1]?.over;
    const range = to ? `${fmt0(from)} – ${fmt0(to)}` : `${fmt0(from)} and over`;
    const tax = b.rate === 0 ? "Nil" : `${b.base ? `${fmt0(b.base)} plus ` : ""}${b.rate}c for each $1 over ${fmt0(b.over)}`;
    return `<tr><td>${range}</td><td>${tax}</td></tr>`;
  }).join("");
  const rateTable = (id, foreign = false) => `<div class="table-scroll"><table><caption>${foreign ? "Foreign residents" : "Australian residents"}, ${label(id)}${ANNUAL_YEARS[id].estimate && !foreign ? " (legislated)" : ""}</caption><thead><tr><th scope="col">Taxable income</th><th scope="col">Tax on this income</th></tr></thead><tbody>${bracketRows(foreign ? ANNUAL_YEARS[id].foreignBrackets : ANNUAL_YEARS[id].residentBrackets)}</tbody></table></div>`;
  // Income tax after offsets for someone whose income is all from work (WATO from 2027-28)
  const taxAfterLito = (s, id) => {
    const gross = incomeTaxCents(s, { taxYear: id });
    const wato = ANNUAL_YEARS[id].wato && s > 18200 ? Math.min(ANNUAL_YEARS[id].wato.max * 100, gross) : 0;
    return Math.max(0, gross - litoCents(s, { taxYear: id }) - wato);
  };
  const compare = [30000, 45000, 60000, 80000, 100000, 135000, 200000].map((sal) => {
    const [a, b, c] = ids.map((id) => taxAfterLito(sal, id));
    return `<tr><td>${fmt0(sal)}</td><td>${fmt(a)}</td><td>${fmt(b)}</td><td>${fmt(c)}</td><td>${fmt(a - c)}</td></tr>`;
  }).join("");
  const r1 = ANNUAL_YEARS["2025-26"].residentBrackets[1].rate, r2 = ANNUAL_YEARS["2026-27"].residentBrackets[1].rate, r3 = ANNUAL_YEARS["2027-28"].residentBrackets[1].rate;
  const S = ANNUAL_YEARS["2026-27"].studyLoan, S0 = ANNUAL_YEARS["2025-26"].studyLoan;
  const L = ANNUAL_YEARS["2026-27"].lito;
  const hero = `<h1>Australian income tax rates ${YEAR_LABEL}</h1>
<p class="intro">Tax brackets for Australian residents for ${YEAR_LABEL} (1 July 2026 to 30 June 2027), compared with last year and next, plus foreign resident rates, the Medicare levy, offsets and HELP repayment thresholds.</p>
${rateTable("2026-27")}
<p class="updated">Updated ${UPDATED}. The 2% Medicare levy is on top of these rates.</p>`;
  const body = `<h2>What changed</h2>
<p>The rate on income between $18,201 and $45,000 was ${r1}% in 2025–26. It fell to ${r2}% on 1 July 2026 and is legislated to fall to ${r3}% from 1 July 2027. The other brackets are unchanged. That's worth up to ${fmt((45000 - 18200) * (r1 - r2))} a year in ${YEAR_LABEL} and ${fmt((45000 - 18200) * (r1 - r3))} a year from 2027–28, compared with 2025–26.</p>
<p>Two more changes became law in June 2026. From ${YEAR_LABEL}, everyone with work income gets a <a href="/guides/standard-deduction/">$1,000 standard deduction</a> for work expenses without needing receipts. From 2027–28, the <a href="/guides/working-australians-tax-offset/">working Australians tax offset</a> takes up to $250 off the tax of people with work income, on top of the 14% rate.</p>
<div class="table-scroll"><table><caption>Income tax after offsets, before the Medicare levy (income from work; the working Australians tax offset applies from 2027–28)</caption><thead><tr><th scope="col">Taxable income</th><th scope="col">2025–26</th><th scope="col">2026–27</th><th scope="col">2027–28</th><th scope="col">Saving by 2027–28</th></tr></thead><tbody>${compare}</tbody></table></div>
${adSlot("rates-mid")}
<h2>Tax rates for 2025–26</h2>
${rateTable("2025-26")}
<h2>Tax rates for 2027–28</h2>
${rateTable("2027-28")}
<h2>Foreign resident tax rates</h2>
<p>Foreign residents pay tax from the first dollar, can't claim the tax-free threshold or the low income tax offset, and don't pay the Medicare levy. The rates are the same in all three years.</p>
${rateTable("2026-27", true)}
<h2>Offsets and levies</h2>
<ul>
<li><strong>Low income tax offset:</strong> up to ${fmt0(L.max)}, reducing from ${fmt0(L.firstThreshold)} and gone at ${fmt0(L.cutOut)}. <a href="/guides/low-income-tax-offset/">How the offset works</a>.</li>
<li><strong>Medicare levy:</strong> 2% of taxable income, less on low incomes. <a href="/guides/medicare-levy-surcharge/">Levy and surcharge thresholds</a>.</li>
<li><strong>Medicare levy surcharge:</strong> 1% to 1.5% for singles earning over ${fmt0(ANNUAL_YEARS["2026-27"].mlsSingles[0].upTo)} (families over ${fmt0(ANNUAL_YEARS["2026-27"].mlsFamily.tiers[0])}) without private hospital cover.</li>
<li><strong>Seniors and pensioners tax offset:</strong> up to ${fmt0(ANNUAL_YEARS["2026-27"].sapto.single.max)} for singles. <a href="/guides/seniors-tax-offset/">SAPTO thresholds</a>.</li>
<li><strong>Working Australians tax offset (from 2027–28):</strong> up to $250 for residents whose work income, after work deductions, is above $18,200. <a href="/guides/working-australians-tax-offset/">How WATO works</a>.</li>
<li><strong>Standard deduction (from ${YEAR_LABEL}):</strong> $1,000 for work-related expenses, no receipts needed. <a href="/guides/standard-deduction/">How it works</a>.</li>
</ul>
<h2>HELP repayment thresholds</h2>
<div class="table-scroll"><table><thead><tr><th scope="col"></th><th scope="col">2025–26</th><th scope="col">2026–27</th></tr></thead><tbody>
<tr><td>Repayments start above</td><td>${fmt0(S0.threshold)}</td><td>${fmt0(S.threshold)}</td></tr>
<tr><td>17c rate starts above</td><td>${fmt0(S0.secondThreshold)}</td><td>${fmt0(S.secondThreshold)}</td></tr>
<tr><td>10% of all income from</td><td>${fmt0(S0.topThreshold)}</td><td>${fmt0(S.topThreshold)}</td></tr>
</tbody></table></div>
<p>Work out your repayment with the <a href="/help-repayment-calculator/">HECS-HELP repayment calculator</a>.</p>
<h2>Super guarantee</h2>
<p>Employers pay 12% of ordinary time earnings into your super fund, on top of your pay. From 1 July 2026 it's due with every pay under <a href="/guides/payday-super/">Payday Super</a>.</p>
<p>See what these rates mean for your pay with the <a href="/">pay calculator</a>, or <a href="/guides/how-much-tax/">how much tax you pay at each salary</a>.</p>
${adSlot("rates-end")}`;
  write(path, layout({ path, title: `Australian tax rates ${YEAR_LABEL}: income tax brackets (and 2025–26, 2027–28)`, description: `Income tax rates and brackets for Australian residents for ${YEAR_LABEL}: 0%, 15%, 30%, 37% and 45%. Compared with 2025–26 and 2027–28, plus foreign resident rates, Medicare levy and HELP thresholds.`, hero, body, crumbs: [{ name: "Tax rates", path }] }));
}

// ---------- HECS-HELP repayment calculator ----------
{
  const path = "/help-repayment-calculator/";
  const S = ANNUAL_YEARS["2026-27"].studyLoan, S0 = ANNUAL_YEARS["2025-26"].studyLoan;
  const form = `<form class="calc" id="help" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
<label class="field wide"><span>Repayment income for the year${tip("h-income")}</span>
<span class="money-input"><span aria-hidden="true">$</span><input id="h-income" inputmode="decimal" autocomplete="off" placeholder="85,000" aria-describedby="h-income-error"></span>
<span class="error" id="h-income-error" role="alert"></span></label>
${segmented("h-period", "I'm paid", [["weekly", "Weekly"], ["fortnightly", "Fortnightly"], ["monthly", "Monthly"]], "fortnightly", true)}
</div>
</div>
<div class="calc-result" aria-live="polite">
<div id="h-empty"><p class="kicker">Compulsory repayment</p><p class="big muted">$0.00</p><p class="sub">Enter your income to see your HELP repayment for the year.</p></div>
<div id="h-result" hidden>
<p class="kicker">Compulsory repayment for the year</p>
<p class="big" id="h-big"></p>
<div class="table-scroll"><table class="compact"><tbody id="h-rows"></tbody></table></div>
<p class="note" id="h-note"></p>
</div></div>
<noscript><p class="note">The calculator needs JavaScript. The table below shows repayments for common incomes.</p></noscript>
</form>
<script type="module" src="${ASSETS}/help.js"></script>
<script type="module" src="${ASSETS}/tips.js"></script>`;
  const hero = `${yearTabs()}
<h1>HECS-HELP repayment calculator <span data-year-label>${YEAR_LABEL}</span></h1>
<p class="intro">Work out your compulsory HELP, VSL, SSL or AASL repayment for the year and the extra tax your employer withholds from each pay to cover it.</p>
${form}`;
  const ex = [65000, 70000, 80000, 100000, 130000, 150000, 190000].map((i) => `<tr><td>${fmt0(i)}</td><td>${fmt(studyLoanRepaymentCents(i, { taxYear: "2025-26" }))}</td><td>${fmt(studyLoanRepaymentCents(i, { taxYear: "2026-27" }))}</td></tr>`).join("");
  const body = `${adSlot("help-below-calc")}
<h2>How compulsory repayments work</h2>
<p>Since 2025–26, repayments are only charged on income above the threshold, like a tax bracket, instead of a percentage of your whole income. For ${YEAR_LABEL}:</p>
<ul>
<li>Up to ${fmt0(S.threshold)}: no compulsory repayment.</li>
<li>${fmt0(S.threshold + 1)} to ${fmt0(S.secondThreshold)}: 15c for each $1 over ${fmt0(S.threshold)}.</li>
<li>${fmt0(S.secondThreshold + 1)} to ${fmt0(S.topThreshold - 1)}: ${fmt0(S.secondBase)} plus 17c for each $1 over ${fmt0(S.secondThreshold)}.</li>
<li>${fmt0(S.topThreshold)} and over: 10% of your whole repayment income.</li>
</ul>
<div class="table-scroll"><table><caption>Compulsory repayment for the year</caption><thead><tr><th scope="col">Repayment income</th><th scope="col">2025–26</th><th scope="col">2026–27</th></tr></thead><tbody>${ex}</tbody></table></div>
<p>In 2025–26 repayments started above ${fmt0(S0.threshold)}. The repayment is capped at what you still owe.</p>
<h2>What counts as repayment income</h2>
<p>Your taxable income plus any reportable fringe benefits, reportable super contributions, net investment losses and exempt foreign employment income. For most employees with no investments, it's simply their taxable income.</p>
<h2>How it's collected</h2>
<p>If you tell your employer you have a study loan on your withholding declaration, they withhold extra tax from each pay. The ATO then works out your actual repayment when you lodge your tax return, and any difference becomes part of your refund or bill. If you don't tell your employer, you'll likely owe it all at tax time: see <a href="/guides/why-do-i-owe-tax/">why you might owe tax</a>.</p>
<h2>Voluntary repayments and indexation</h2>
<p>You can pay extra to the ATO at any time. Debts are indexed each 1 June, by the lower of the consumer price index and the wage price index.</p>
<p>See your whole tax position with the <a href="/tax-refund-calculator/">tax refund calculator</a> (turn on "HELP or study loan").</p>
${adSlot("help-end")}`;
  write(path, layout({ path, title: `HECS-HELP repayment calculator ${YEAR_LABEL}: compulsory repayments`, description: `Free HECS-HELP repayment calculator for ${YEAR_LABEL}. Your compulsory study loan repayment under the new marginal system, thresholds from ${fmt0(S.threshold)}, and the extra withheld from each pay.`, hero, body, crumbs: [{ name: "HECS-HELP repayment calculator", path }] }));
}

// ---------- GST calculator ----------
{
  const path = "/gst-calculator/";
  const form = `<form class="calc" id="gst" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
<label class="field wide"><span>Amount</span>
<span class="money-input"><span aria-hidden="true">$</span><input id="g-amount" inputmode="decimal" autocomplete="off" placeholder="110.00" aria-describedby="g-amount-error"></span>
<span class="error" id="g-amount-error" role="alert"></span></label>
${segmented("g-mode", "This amount", [["add", "Excludes GST (add it)"], ["remove", "Includes GST (remove it)"]], "add", true)}
</div>
</div>
<div class="calc-result" aria-live="polite">
<div id="g-empty"><p class="kicker">GST</p><p class="big muted">$0.00</p><p class="sub">Enter an amount to add or remove 10% GST.</p></div>
<div id="g-result" hidden>
<p class="kicker" id="g-label"></p>
<p class="big" id="g-big"></p>
<div class="table-scroll"><table class="compact"><tbody id="g-rows"></tbody></table></div>
</div></div>
<noscript><p class="note">The calculator needs JavaScript. To add GST multiply by 1.1; to find the GST in a price divide by 11.</p></noscript>
</form>
<script type="module" src="${ASSETS}/gst.js"></script>`;
  const hero = `<h1>GST calculator</h1>
<p class="intro">Add 10% GST to a price, or work out how much GST is included in a price, for Australian goods and services.</p>
${form}`;
  const add = (c) => Math.round(c / 10);
  const inc = (c) => Math.round(c / 11);
  const ex = [1000, 5000, 11000, 50000, 100000, 550000].map((c) => `<tr><td>${fmt(c)}</td><td>${fmt(add(c))}</td><td>${fmt(c + add(c))}</td><td>${fmt(inc(c))}</td><td>${fmt(c - inc(c))}</td></tr>`).join("");
  const body = `${adSlot("gst-below-calc")}
<h2>How to calculate GST</h2>
<ul>
<li><strong>Add GST:</strong> multiply the price excluding GST by 1.1. The GST is 10% of the price.</li>
<li><strong>Find the GST in a price:</strong> divide the price including GST by 11.</li>
<li><strong>Remove GST:</strong> subtract that amount, or multiply the price including GST by 10 and divide by 11.</li>
</ul>
<div class="table-scroll"><table><thead><tr><th scope="col">Amount</th><th scope="col">GST to add</th><th scope="col">Price plus GST</th><th scope="col">GST included</th><th scope="col">Price without GST</th></tr></thead><tbody>${ex}</tbody></table></div>
<h2>When a business must register for GST</h2>
<ul>
<li>Your GST turnover is $75,000 a year or more ($150,000 for non-profit organisations).</li>
<li>You provide taxi or ride-sourcing services, whatever your turnover.</li>
</ul>
<p>Registered businesses add GST to their prices, lodge business activity statements, and claim back the GST included in their business purchases.</p>
<h2>GST-free sales</h2>
<p>Some things don't have GST, including most basic food, many health and medical services, education courses, childcare and exports.</p>
<h2>Tax invoices</h2>
<p>For a sale over $82.50 including GST, a GST-registered business must give the buyer a tax invoice within 28 days if asked. The buyer needs it to claim the GST back.</p>
<p>Employees don't pay GST on their wages: see the <a href="/">pay calculator</a> for tax on your pay.</p>
${adSlot("gst-end")}`;
  write(path, layout({ path, title: "GST calculator Australia: add or remove 10% GST", description: "Free Australian GST calculator. Add 10% GST to a price or work out the GST included in a price, with the formulas, examples and when to register.", hero, body, crumbs: [{ name: "GST calculator", path }] }));
}

// ---------- tax tables ----------
buildTaxTables({ write, layout, esc, fmt0, calculateWithholding, segmented, adSlot, ASSETS, YEAR_LABEL, UPDATED });

// ---------- jobs, payslip checker, rent ----------
buildExtraPages({ write, layout, esc, fmt, fmt0, payRow, summaryCards, splitBar, yearTaxSection, calculatorForm, adSlot, segmented, tip, HELP, salaryPageFor, YEAR_LABEL, UPDATED, ASSETS, SUPER_PER_MILLE });
buildLocalizedPages({ write, layout, esc, fmt, fmt0, payRow, fromAnnual, estimateAnnualTax, adSlot, logoMark, LOGO_WORD, SITE_NAME, POPULAR, ANNUAL_YEARS, YEAR_LABEL, UPDATED, ASSETS, SUPER_PER_MILLE });

// ---------- guides ----------
const helpers = { ASSETS, segmented, payRow, fromAnnual, fromHourly, fmt, fmt0, calculateWithholding, calculateBonusWithholding, estimateAnnualTax, splitPackage, ANNUAL_YEARS, incomeTaxCents, litoCents, saptoCents, medicareLevySurchargeCents, studyLoanRepaymentCents };
function guideDescription(g) { return typeof g.description === "function" ? g.description(helpers) : g.description; }
for (const g of GUIDES) {
  const path = `/guides/${g.slug}/`;
  let guideBody = g.body(helpers);
  const second = guideBody.indexOf("<h2>", guideBody.indexOf("<h2>") + 1);
  if (second > 0) guideBody = guideBody.slice(0, second) + adSlot("guide-mid") + "\n" + guideBody.slice(second);
  write(path, layout({ path, title: g.title, description: guideDescription(g), body: `<h1>${esc(g.h1)}</h1>\n<p class="updated">Updated ${UPDATED}.</p>\n${guideBody}\n${adSlot("guide-end")}`, crumbs: [{ name: "Guides", path: "/guides/" }, { name: g.h1, path }] }));
}
{
  const path = "/guides/";
  const body = `<h1>Guides to tax on your pay</h1>
<p class="intro">Plain explanations of how tax is taken out of your pay in Australia, with worked numbers for ${YEAR_LABEL}.</p>
<ul class="cards">${GUIDES.map((g) => `<li><a href="/guides/${g.slug}/">${esc(g.h1)}</a><p>${esc(guideDescription(g))}</p></li>`).join("")}</ul>`;
  write(path, layout({ path, title: `Guides to tax on your pay in Australia (${YEAR_LABEL})`, description: "Plain-English guides to tax withheld, the tax-free threshold, second jobs, Payday Super and more.", body, crumbs: [{ name: "Guides", path }] }));
}

// ---------- about ----------
{
  const path = "/about/";
  const body = `<h1>How we calculate</h1>
<p>Tax withheld comes from the ATO's <em>Schedule 1 – Statement of formulas for calculating amounts to be withheld</em> (NAT 1004): for 2026–27 the formulas in legislative instrument LI 2026/18, and for 2025–26 the formulas that applied from 1 July 2024. These are the same formulas payroll software uses. Tax for the year uses the ATO's published tax rates, offsets and thresholds.</p>
<h2>How we check it</h2>
<p>The ATO publishes sample data so payroll software developers can test their calculations. Our calculator is tested against every one of those sample rows (432 for each of 2025–26 and 2026–27), covering weekly, fortnightly and monthly pays across the tax scales and Medicare levy adjustments, and it matches all of them to the dollar. Study loans, bonuses, seniors, the Medicare levy family reduction, the surcharge and HELP repayments are checked against the ATO's worked examples.</p>
<h2>What the figures include</h2>
<ul>
<li>Tax withheld under scales 1 to 6: tax-free threshold claimed or not, foreign residents, no TFN and Medicare levy exemptions.</li>
<li>Study and training support loans (HELP and others, Schedule 8), seniors and pensioners (Schedule 9), bonuses (Schedule 5, Method A), the Medicare levy variation for families, and tax offsets claimed on a withholding declaration.</li>
<li>Tax for the year: income tax, the $1,000 standard deduction for work expenses (from 2026–27), the low income tax offset, the seniors and pensioners tax offset, the working Australians tax offset (from 2027–28), the Medicare levy (with low-income and family reductions), the Medicare levy surcharge and compulsory study loan repayments.</li>
<li>Super at the 12% super guarantee rate, paid by your employer on top of your pay.</li>
</ul>
<h2>What they don't include yet</h2>
<ul>
<li>Working holiday maker rates, back payments, termination payments and Fair Work award rates.</li>
<li>Your exact final tax, which depends on your full income, deductions and offsets and is worked out when you lodge a tax return.</li>
</ul>
<p>The calculations are open source and available to software and AI assistants through our <a href="/developers/">API and MCP server</a>.</p>
<p>This site gives general information, not financial or tax advice, and isn't affiliated with the ATO. For your own situation, check with the ATO or a registered tax agent.</p>`;
  write(path, layout({ path, title: `How we calculate tax withheld (${YEAR_LABEL}) – ${SITE_NAME}`, description: "Our figures use the ATO's withholding formulas and published tax rates for 2025–26 and 2026–27, tested against all of the ATO's published sample data.", body, crumbs: [{ name: "How we calculate", path }] }));
}

// ---------- tax refund calculator ----------
{
  const path = "/tax-refund-calculator/";
  const hero = `${yearTabs()}
<h1>Tax refund calculator <span data-year-label>${YEAR_LABEL}</span></h1>
<p class="intro">Estimate the tax you'll owe for the year and whether you'll get a refund or a bill, from your salary, other income and deductions.</p>
${refundCalculatorForm()}`;
  const ex = [60000, 85000, 120000].map((s) => {
    const r = estimateAnnualTax({ salary: s });
    return `<tr><td><a href="/salary/${s}/">${fmt0(s)}</a></td><td>${fmt(r.cents.totalLiability)}</td><td>${fmt(r.cents.withheld)}</td><td>${fmt(r.cents.refund)}</td></tr>`;
  }).join("");
  const body = `${adSlot("refund-below-calc")}
<h2>How the estimate works</h2>
<ol>
<li><strong>Taxable income:</strong> your salary plus other income, minus deductions. From 2026–27 everyone with work income gets a $1,000 standard deduction for work expenses without receipts; if your actual work expenses are higher, enter them instead.</li>
<li><strong>Tax for the year:</strong> ${YEAR_LABEL} income tax rates (nothing on the first $18,200, then 15%, 30%, 37% and 45%), less the low income tax offset of up to $700, plus the 2% Medicare levy. If you have a study loan we add the compulsory repayment, and if you earn over $105,000 without private hospital cover we add the Medicare levy surcharge. From 2027–28 the working Australians tax offset takes up to $250 off for people with work income.</li>
<li><strong>Tax withheld:</strong> what your employer takes out of each pay under the ATO's withholding formulas, across a full year.</li>
<li><strong>Refund or bill:</strong> tax withheld minus tax for the year.</li>
</ol>
<h2>Why most people with one job get a small refund or none</h2>
<p>The withholding formulas are designed to take out close to the right amount over a year. With one job, no deductions and no other income, the difference is usually small:</p>
<div class="table-scroll"><table><thead><tr><th scope="col">Salary</th><th scope="col">Tax for the year</th><th scope="col">Withheld</th><th scope="col">Refund</th></tr></thead><tbody>${ex}</tbody></table></div>
<p>Bigger refunds usually come from deductions, and bills usually come from income with no tax withheld, a second job, or a study loan your employer didn't know about.</p>
<div class="box"><p><strong>This is an estimate.</strong> It assumes you're single with no dependants and one employer for the full year, and approximates study loan and surcharge income by taxable income. The ATO hasn't yet set the ${YEAR_LABEL} Medicare levy low-income thresholds, so we use the latest legislated ones. Your actual result comes from your tax return.</p></div>`;
  write(path, layout({ path, title: `Tax refund calculator Australia ${YEAR_LABEL}: estimate your tax return`, description: `Free ${YEAR_LABEL} tax refund calculator. Estimate your tax for the year, the low income tax offset, Medicare levy and HELP repayments, and whether you'll get a refund.`, hero, body, crumbs: [{ name: "Tax refund calculator", path }] }));
}

// ---------- home ----------
{
  const path = "/";
  const hero = `${yearTabs()}
<h1>Australian pay calculator <span data-year-label>${YEAR_LABEL}</span></h1>
<p class="intro">See your take-home pay, the tax withheld and the super your employer pays, from a salary, a pay or an hourly rate.</p>
${calculatorForm()}`;
  const popularRows = POPULAR.map((s) => {
    const a = fromAnnual(s);
    const w = payRow(a.weekly, "weekly"), f = payRow(a.fortnightly, "fortnightly"), m = payRow(a.monthly, "monthly");
    return `<tr><td><a href="/salary/${s}/">${fmt0(s)}</a></td><td>${fmt(w.net)}</td><td>${fmt(f.net)}</td><td>${fmt(m.net)}</td></tr>`;
  }).join("");
  const body = `${adSlot("home-below-calc")}
<h2>Take-home pay for popular salaries</h2>
<p>Main job, tax-free threshold claimed. Select a salary for the full breakdown.</p>
<div class="table-scroll"><table><thead><tr><th scope="col">Salary</th><th scope="col">Weekly</th><th scope="col">Fortnightly</th><th scope="col">Monthly</th></tr></thead><tbody>${popularRows}</tbody></table></div>
<p class="more"><a href="/salary/">Every salary from $20,000 to $500,000</a><a href="/hourly/">Hourly rates from $20 to $100</a><a href="/tax-refund-calculator/">Estimate your tax refund</a></p>
${adSlot("home-mid")}
<h2>More calculators</h2>
<ul class="cards">${[
    ["/tax-refund-calculator/", "Tax refund calculator", "Estimate your refund or bill for the year from your income and deductions."],
    ["/tax-rates/", `Tax rates ${YEAR_LABEL}`, "Tax brackets for this year, last year and next, with the Medicare levy and offsets."],
    ["/help-repayment-calculator/", "HECS-HELP repayment calculator", "Your compulsory study loan repayment and the extra taken from each pay."],
    ["/gst-calculator/", "GST calculator", "Add 10% GST to a price or take it out."],
    ["/weekly/", "Weekly pay after tax", "Take-home pay for every weekly amount from $300 to $3,000."],
    ["/fortnightly/", "Fortnightly pay after tax", "Take-home pay for every fortnightly amount from $1,000 to $6,000."],
    ["/tax-tables/", `Tax tables ${YEAR_LABEL}`, "Tax withheld from weekly, fortnightly and monthly pay, with a lookup for any amount."],
    ["/payslip-checker/", "Payslip and super checker", "Check the tax and super on your payslip against the ATO's formulas."],
    ["/jobs/", "Pay after tax by job", "Median pay and take-home pay for nearly 300 occupations."],
    ["/rent/", "Rent vs take-home pay", "How much of your pay the median rent takes in your area of NSW or Victoria."],
  ].map(([href, name, text]) => `<li><a href="${href}">${name}</a><p>${text}</p></li>`).join("")}</ul>
<h2>Guides</h2>
<ul class="cards">${GUIDES.slice(0, 6).map((g) => `<li><a href="/guides/${g.slug}/">${esc(g.h1)}</a><p>${esc(guideDescription(g))}</p></li>`).join("")}</ul>`;
  const jsonld = [{ "@context": "https://schema.org", "@type": "Organization", name: SITE_NAME, url: BASE + "/", logo: BASE + "/logo-512.png" }, { "@context": "https://schema.org", "@type": "WebApplication", name: `${SITE_NAME} – Australian pay calculator`, url: BASE + "/", applicationCategory: "FinanceApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" } }];
  write(path, layout({ path, title: `Pay calculator Australia ${YEAR_LABEL}: take-home pay after tax`, description: `Free Australian pay calculator for ${YEAR_LABEL}. Work out take-home pay, tax withheld and super from your salary, pay or hourly rate, using the ATO's formulas.`, hero, body, jsonld }));
}

// ---------- 404, sitemap, robots, assets ----------
writeFileSync(new URL("404.html", out), layout({ path: "/404.html", title: `Page not found – ${SITE_NAME}`, description: "Page not found.", body: `<h1>Page not found</h1><p>Try the <a href="/">pay calculator</a>, <a href="/salary/">salary list</a> or <a href="/guides/">guides</a>.</p>` }));
const today = new Date().toISOString().slice(0, 10);
{
  const path = "/privacy/";
  const body = `<h1>Privacy policy</h1>
<p class="updated">Updated ${UPDATED}.</p>
<p>${esc(SITE_NAME)} is a free calculator site. This page explains what information is collected when you use it.</p>
<h2>What you enter in the calculators</h2>
<p>All calculations happen in your browser. The amounts you type are not sent to us or stored on our servers. Your browser may remember your chosen tax year on this device so the calculators open on it next time.</p>
<h2>Advertising and cookies</h2>
<p>We may show ads from Google and its partners. Third-party vendors, including Google, use cookies to serve ads based on your previous visits to this site and other websites. Google's use of advertising cookies lets it and its partners serve ads based on your visits here and elsewhere on the internet.</p>
<p>You can opt out of personalised advertising in <a href="https://adssettings.google.com" rel="nofollow">Google's Ads Settings</a>, and learn more in <a href="https://policies.google.com/technologies/partner-sites" rel="nofollow">How Google uses information from sites that use its services</a>.</p>
<h2>Analytics</h2>
<p>We use Cloudflare Web Analytics to count visits and see which pages are useful. It doesn't use cookies, doesn't track you across other websites and doesn't identify you personally.</p>
<h2>Contact</h2>
<p>${CONTACT_EMAIL ? `Questions about privacy? Email <a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a>.` : "Questions about privacy? Contact us through the details on this site."}</p>`;
  write(path, layout({ path, title: `Privacy policy – ${SITE_NAME}`, description: `How ${SITE_NAME} handles your information, cookies and advertising.`, body, crumbs: [{ name: "Privacy", path }] }));
}
{
  const path = "/contact/";
  const mail = `<a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a>`;
  const body = `<h1>Contact us</h1>
<p class="intro">Email ${mail}. We read every message and usually reply within a few days.</p>
<h2>Good reasons to get in touch</h2>
<ul>
<li><strong>A figure looks wrong.</strong> Tell us the page, the amount and what you expected. Every calculation is tested against the ATO's sample data, but we fix anything that slips through.</li>
<li><strong>A calculator or guide you'd like to see.</strong></li>
<li><strong>Using the API or MCP server</strong> in your software or AI assistant: see the <a href="/developers/">developer docs</a>.</li>
<li><strong>Advertising or partnerships.</strong></li>
</ul>
<h2>What we can't help with</h2>
<p>We can't give personal tax advice or look at your tax affairs. For that, contact the <a href="https://www.ato.gov.au/" rel="nofollow">ATO</a> or a registered tax agent.</p>
<p>Read <a href="/about/">how we calculate</a> and our <a href="/privacy/">privacy policy</a>.</p>`;
  write(path, layout({ path, title: `Contact us – ${SITE_NAME}`, description: `Get in touch with ${SITE_NAME}: report a figure that looks wrong, suggest a calculator, or ask about the API.`, body, crumbs: [{ name: "Contact", path }] }));
}
if (ADS.enabled) {
  // ads.txt authorises Google to sell ads on this domain (publisher id is the client id without "ca-").
  writeFileSync(new URL("ads.txt", out), `google.com, ${ADS.client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`);
}
// ---------- AI agents and developers ----------
{
  const path = "/developers/";
  const mcpUrl = `${BASE}/mcp`;
  const example = runTool("take_home_pay", { salary: 80000 }, { siteUrl: BASE });
  const excerpt = JSON.stringify({ taxYear: example.taxYear, perPay: { fortnightly: example.perPay.fortnightly }, year: example.year, taxForTheYear: example.taxForTheYear, calculatorPage: example.calculatorPage }, null, 2);
  const code = (text) => `<pre><code>${esc(text)}</code></pre>`;
  const body = `<h1>Australian tax API and MCP server for AI agents</h1>
<p class="intro">Every calculation on this site is free to use from AI assistants and your own code: connect Claude, ChatGPT, Cursor or any MCP client to our MCP server, call the JSON API, or install the open-source JavaScript library. No sign-up or API key.</p>
<div class="box"><p><strong>Why use it instead of the model's memory?</strong> Australian tax rates changed on 1 July 2026 (the 16% rate fell to 15%), and PAYG withholding uses the ATO's own formulas and rounding, not the tax brackets. AI models trained before then get these numbers wrong. These tools use the ATO's published formulas and match every row of the ATO's sample data for 2025–26 and 2026–27.</p></div>
<h2 id="mcp">Connect an AI assistant (MCP)</h2>
<p>Server URL (Streamable HTTP, no login):</p>
${code(mcpUrl)}
<p><strong>Claude and ChatGPT:</strong> add a custom connector and paste the URL above.</p>
<p><strong>Claude Code:</strong></p>
${code(`claude mcp add --transport http au-tax ${mcpUrl}`)}
<p><strong>Cursor, Windsurf and other clients</strong> (mcp.json):</p>
${code(JSON.stringify({ mcpServers: { "au-tax": { url: mcpUrl } } }, null, 2))}
<p><strong>Run it locally instead</strong> (Node 18 or later, works offline):</p>
${code(JSON.stringify({ mcpServers: { "au-tax": { command: "npx", args: ["-y", "au-compliance-kit", "mcp"] } } }, null, 2))}
<h2 id="tools">Tools</h2>
<div class="table-scroll"><table><thead><tr><th scope="col">Tool</th><th scope="col">What it does</th></tr></thead><tbody>${TOOLS.map((t) => `<tr><td><code>${t.name}</code></td><td>${esc(t.description.split(". ")[0])}.</td></tr>`).join("")}</tbody></table></div>
<h2 id="api">JSON API</h2>
<p>Every tool is also a plain web address, so an assistant that can only open links can still use it. Send the same fields as query parameters, or POST them as JSON. The <a href="/openapi.json">OpenAPI description</a> works with custom GPT actions and API clients.</p>
${code(`${BASE}/api/take_home_pay?salary=80000`)}
${code(excerpt)}
${code(`curl -X POST ${BASE}/api/annual_tax_estimate \\
  -H "Content-Type: application/json" \\
  -d '{"salary": 95000, "deductions": 1800, "studyLoan": true}'`)}
<p>Other tools: ${TOOLS.map((t) => `<code>/api/${t.name}</code>`).join(", ")}. <a href="/api">/api</a> lists them with their fields.</p>
<h2 id="library">JavaScript library</h2>
<p>The same calculations as an <a href="https://www.npmjs.com/package/au-compliance-kit">npm package</a> with no dependencies, for payroll and HR software. The code is open source on <a href="https://github.com/aftertaxau/au-compliance-kit">GitHub</a>.</p>
${code(`npm install au-compliance-kit`)}
${code(`import { calculateWithholding, estimateAnnualTax } from "au-compliance-kit";

calculateWithholding({ earnings: 2026.77, period: "fortnightly", payDate: "2026-11-13" });
// { withholding: 284, scale: 2, ... }`)}
<h2>What's covered</h2>
<ul>
<li>PAYG withholding for 2025–26 and 2026–27: tax-free threshold, no TFN, foreign residents, HELP and study loans, Medicare levy exemptions and family variations, tax offsets, seniors and pensioners, and bonuses (Method A).</li>
<li>Income tax for 2025–26, 2026–27 and 2027–28 (an estimate), with offsets, the Medicare levy and surcharge, and study loan repayments.</li>
<li>Super guarantee (12%) and ABN, ACN, TFN, BSB and account number checks.</li>
</ul>
<p>Not covered yet: working holiday makers, back payments, termination payments, and Fair Work award rates.</p>
<h2>Fair use and privacy</h2>
<p>The API and MCP server are free for reasonable use. We don't store the amounts you send. Results are general information, not tax advice, and we're not affiliated with the ATO.</p>`;
  write(path, layout({ path, title: `Australian tax API and MCP server for AI agents – ${SITE_NAME}`, description: "Free Australian pay and tax API and MCP server: take-home pay, PAYG withholding, tax refunds, super and ABN checks for Claude, ChatGPT, Cursor and your own code. ATO formulas, no API key.", body, crumbs: [{ name: "API and AI agents", path }] }));

  // OpenAPI description (custom GPT actions and API clients). Action descriptions are kept under 300 characters.
  const short = (text) => {
    let outText = "";
    for (const sentence of text.split(/(?<=\.)\s+/)) {
      if ((outText + " " + sentence).trim().length > 300) break;
      outText = (outText + " " + sentence).trim();
    }
    return outText || text.slice(0, 297) + "...";
  };
  const openapi = {
    openapi: "3.1.0",
    info: { title: `${SITE_NAME} API: Australian pay and tax`, version: VERSION, description: "Australian take-home pay, PAYG withholding, income tax and refunds, super guarantee and ABN/TFN checks, using the ATO's published formulas and rates. Free, no API key." },
    servers: [{ url: BASE }],
    paths: Object.fromEntries(TOOLS.map((t) => [`/api/${t.name}`, {
      post: {
        operationId: t.name,
        summary: t.title,
        description: short(t.description),
        requestBody: { required: true, content: { "application/json": { schema: t.inputSchema } } },
        responses: {
          200: { description: "Result, amounts in AUD", content: { "application/json": { schema: { type: "object" } } } },
          400: { description: "Input to fix; the error says what", content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } } },
        },
      },
    }])),
  };
  writeFileSync(new URL("openapi.json", out), JSON.stringify(openapi, null, 2) + "\n");

  // llms.txt: a plain-text map of the site for AI assistants (llmstxt.org), with the key figures.
  const y = ANNUAL_YEARS["2026-27"];
  const b = y.residentBrackets;
  const bracketText = b.map((x, i) => {
    const from = x.over === 0 ? 0 : x.over + 1;
    const to = b[i + 1]?.over;
    return to ? `${x.rate}% on ${fmt0(from)}–${fmt0(to)}` : `${x.rate}% over ${fmt0(x.over)}`;
  }).join("; ");
  const ex = runTool("take_home_pay", { salary: 80000 });
  const fortnight = (s) => runTool("take_home_pay", { salary: s }).perPay.fortnightly.takeHomePay;
  const llms = `# ${SITE_NAME}

> Free Australian take-home pay, tax withheld and tax refund calculators for 2025–26, 2026–27 and 2027–28. Figures use the ATO's PAYG withholding formulas (Schedule 1, NAT 1004) and match every row of the ATO's published sample data.

Key figures for 2026–27 (1 July 2026 to 30 June 2027), Australian residents:

- Income tax rates: ${bracketText}.
- The 15% rate was 16% in 2025–26 and falls to 14% from 1 July 2027.
- Low income tax offset: up to ${fmt0(y.lito.max)}, nil from ${fmt0(y.lito.cutOut)}. Medicare levy: ${y.medicare.rate}%. Super guarantee: 12% on top of salary.
- HELP and other study loan repayments start at ${fmt0(y.studyLoan.threshold)} of repayment income.
- From 2026–27, residents with work income get a $1,000 standard deduction for work-related expenses (no receipts; itemise instead if expenses are higher). From 2027–28, the working Australians tax offset (WATO) gives up to $250 to residents whose net labour income exceeds $18,200. Both are in the Treasury Laws Amendment (Tax Reform No. 1) Act 2026.
- Example: an $80,000 salary takes home ${fmt(ex.perPay.fortnightly.takeHomePay * 100)} a fortnight (${fmt(ex.year.takeHomePay * 100)} a year) after ${fmt(ex.perPay.fortnightly.taxWithheld * 100)} tax withheld each fortnight. Tax for the year, after the $1,000 standard deduction, is ${fmt(ex.taxForTheYear.totalTax * 100)}, so the refund is about ${fmt(ex.taxForTheYear.estimatedRefund * 100)}.

For exact figures for any salary, use the MCP server or JSON API below rather than estimating.

## Calculators

- [Pay calculator](${BASE}/): take-home pay from a salary, pay or hourly rate, with super, overtime, bonuses, HELP, Medicare options and the seniors offset
- [Tax refund calculator](${BASE}/tax-refund-calculator/): estimated tax refund or bill for 2025–26, 2026–27 or 2027–28
- [Tax rates 2026–27](${BASE}/tax-rates/): resident and foreign resident tax brackets for 2025–26, 2026–27 and 2027–28, with the Medicare levy, offsets and HELP thresholds
- [HECS-HELP repayment calculator](${BASE}/help-repayment-calculator/): compulsory study loan repayment for the year and the extra withheld from each pay
- [Tax tables](${BASE}/tax-tables/): tax withheld from weekly, fortnightly and monthly pay in 2026-27, with and without the tax-free threshold
- [GST calculator](${BASE}/gst-calculator/): add or remove 10% GST
- [Payslip and super checker](${BASE}/payslip-checker/): checks the tax withheld and super on a payslip against the ATO's formulas and the 12% super guarantee, and when super is due under Payday Super
- [Pay after tax by job](${BASE}/jobs/): median full-time pay (ABS, May 2025, via Jobs and Skills Australia) and take-home pay for nearly 300 occupations
- [Rent vs take-home pay](${BASE}/rent/): median rents for new leases (June quarter 2026) in about 200 NSW and Victorian council areas compared with take-home pay
${LOCALES.map((l) => `- [${l.t.langName}](${BASE}/${l.code}/): pay calculator, popular salaries and tax rates in ${l.t.langName}`).join("\n")}

## Salary after tax (2026–27)

${POPULAR.map((s) => `- [${fmt0(s)} after tax](${BASE}/salary/${s}/): take home ${fmt(fortnight(s) * 100)} a fortnight`).join("\n")}
- [Every salary from $20,000 to $500,000](${BASE}/salary/)
- [Hourly rates from $20 to $100](${BASE}/hourly/)
- [Weekly pay from $300 to $3,000 a week](${BASE}/weekly/)
- [Fortnightly pay from $1,000 to $6,000 a fortnight](${BASE}/fortnightly/)

## Guides

${GUIDES.map((g) => `- [${g.h1}](${BASE}/guides/${g.slug}/): ${guideDescription(g)}`).join("\n")}

## For AI agents and developers

- [API and MCP docs](${BASE}/developers/): connect Claude, ChatGPT, Cursor or any MCP client; no API key
- MCP server (Streamable HTTP): ${BASE}/mcp
- [JSON API](${BASE}/api): for example ${BASE}/api/take_home_pay?salary=80000
- [OpenAPI description](${BASE}/openapi.json)
- [JavaScript library on npm](https://www.npmjs.com/package/au-compliance-kit): \`npx -y au-compliance-kit mcp\` runs the MCP server locally
- [Source code on GitHub](https://github.com/aftertaxau/au-compliance-kit)

## Optional

- [How we calculate](${BASE}/about/)
- [Privacy](${BASE}/privacy/)
`;
  writeFileSync(new URL("llms.txt", out), llms);
}
writeFileSync(new URL("sitemap.xml", out), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>${BASE}${p}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
writeFileSync(new URL("robots.txt", out), `# Search engines and AI assistants are welcome to read and cite these calculators.\n# Tools for AI agents: ${BASE}/llms.txt\nUser-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);
cpSync(new URL("site/assets", root), new URL(`.${ASSETS}`, out), { recursive: true });
cpSync(new URL("site/static", root), out, { recursive: true }); // favicons and logo at stable root paths
cpSync(new URL("src", root), new URL(`.${ASSETS}/lib`, out), { recursive: true });
console.log(`Built ${pages.length} pages into dist/ for ${BASE}`);
