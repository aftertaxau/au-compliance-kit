// Translated pages: a pay calculator with a newcomer's guide to tax, the popular salary pages and the
// tax rates page in each language that has a strings file in scripts/i18n/ (en.json is the source).
// Figures are calculated with the library exactly as on the English pages.
import { existsSync, readFileSync } from "node:fs";

const dir = new URL("./i18n/", import.meta.url);
const readJson = (name) => JSON.parse(readFileSync(new URL(name, dir), "utf8"));
const EN = readJson("en.json");
const CODES = ["zh", "hi", "ne", "vi", "ko"];

/** Languages with a translation file, each with English as the fallback for any missing string. */
export const LOCALES = CODES.filter((code) => existsSync(new URL(`${code}.json`, dir))).map((code) => ({ code, t: { ...EN, ...readJson(`${code}.json`) } }));

// The English pages that have translations (salaries must match POPULAR in build-site.mjs).
const POPULAR_SALARIES = [45000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000, 110000, 120000, 130000, 150000];
const englishFor = (path) => {
  if (path === "/" || path === "/tax-rates/") return path;
  const m = path.match(/^\/salary\/(\d+)\/$/);
  return m && POPULAR_SALARIES.includes(Number(m[1])) ? path : null;
};

/**
 * hreflang alternates for a page: { "en-AU": "/salary/80000/", "zh-Hans": "/zh/salary/80000/", ... },
 * or null when the page has no translations.
 */
export function localizedPathsFor(path) {
  if (!LOCALES.length) return null;
  const local = path.match(/^\/(zh|hi|ne|vi|ko)(\/.*)$/);
  const english = local ? englishFor(local[2]) : englishFor(path);
  if (!english) return null;
  const map = { "en-AU": english };
  for (const l of LOCALES) map[l.t.htmlLang] = `/${l.code}${english}`;
  return map;
}

const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

/** @param {any} ctx helpers from build-site.mjs */
export function buildLocalizedPages(ctx) {
  for (const locale of LOCALES) buildLocale(ctx, locale);
}

function buildLocale(ctx, { code, t }) {
  const { write, layout, esc, fmt, fmt0, payRow, fromAnnual, estimateAnnualTax, adSlot, logoMark, LOGO_WORD, SITE_NAME, ANNUAL_YEARS, YEAR_LABEL, ASSETS, SUPER_PER_MILLE } = ctx;
  const base = `/${code}`;
  const year = YEAR_LABEL;

  const languageLinks = (path) => {
    const alt = localizedPathsFor(path) || { "en-AU": "/" };
    return [`<a href="${alt["en-AU"]}" lang="en">English</a>`, ...LOCALES.map((l) => (l.code === code ? `<strong lang="${l.t.htmlLang}">${esc(l.t.langName)}</strong>` : `<a href="${alt[l.t.htmlLang] || `/${l.code}/`}" lang="${l.t.htmlLang}">${esc(l.t.langName)}</a>`))].join(" · ");
  };
  const locale = {
    code,
    t,
    nav: (path) => {
      const english = (localizedPathsFor(path) || {})["en-AU"] || "/";
      const cur = (p) => (path === p ? ' aria-current="page"' : "");
      return `<nav class="nav" id="site-nav" aria-label="Main"><a href="${base}/"${cur(`${base}/`)}>${esc(t.navCalculator)}</a><a href="${base}/tax-rates/"${cur(`${base}/tax-rates/`)}>${esc(t.navTaxRates)}</a><a href="${english}" lang="en">English</a></nav>`;
    },
    footer: () => `<footer class="site-footer">
<div class="wrap footer-grid">
<div class="footer-about"><a class="logo logo-light" href="${base}/" aria-label="${esc(SITE_NAME)}">${logoMark(true)}${LOGO_WORD}</a>
<p>${esc(t.disclaimer)}</p></div>
</div>
<div class="wrap footer-bottom">
<p class="lang-links">${esc(t.languages)}: ${languageLinksCache}</p>
<p><a href="/" lang="en">${esc(t.moreInEnglish)}</a> · <a href="/privacy/" lang="en">Privacy</a> · <a href="/contact/" lang="en">Contact</a></p>
</div>
</footer>`,
  };
  let languageLinksCache = "";
  const page = (path, opts) => {
    languageLinksCache = languageLinks(path);
    write(path, layout({ path, locale, ...opts }));
  };

  // ---- shared pieces ----
  const PERIODS = [["weekly", t.week, 52], ["fortnightly", t.fortnight, 26], ["monthly", t.month, 12]];
  const seg = (name, legend, options, selected, wide = false) => `<fieldset class="field seg-field${wide ? " wide" : ""}"><legend>${esc(legend)}</legend><div class="segmented">${options.map(([v, label]) => `<label><input type="radio" name="${name}" value="${v}"${v === selected ? " checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div></fieldset>`;
  const calcStrings = JSON.stringify({ week: t.week, fortnight: t.fortnight, month: t.month, year: t.year, resultNote: t.resultNote, error: t.error }).replace(/</g, "\\u003c");
  const calculator = (amount = "") => `<form class="calc" id="lcalc" novalidate onsubmit="return false">
<div class="calc-inputs">
<div class="calc-grid">
<label class="field wide"><span>${esc(t.amountLabel)}</span>
<span class="money-input"><span aria-hidden="true">$</span><input id="l-amount" inputmode="decimal" autocomplete="off" placeholder="85,000" value="${esc(amount)}" aria-describedby="l-amount-error"></span>
<span class="error" id="l-amount-error" role="alert"></span></label>
${seg("l-per", t.perLabel, [["year", t.perYear], ["fortnight", t.perFortnight], ["week", t.perWeek], ["hour", t.perHour]], "year", true)}
<label class="field wide" id="l-hours-field" hidden><span>${esc(t.hoursLabel)}</span><input id="l-hours" inputmode="decimal" value="38"></label>
${seg("l-res", t.residencyLabel, [["resident", t.resident], ["foreign", t.foreign]], "resident")}
${seg("l-tft", t.tftLabel, [["yes", t.tftYes], ["no", t.tftNo]], "yes")}
${seg("l-help", t.helpLabel, [["no", t.no], ["yes", t.yes]], "no")}
</div>
</div>
<div class="calc-result" aria-live="polite">
<p class="kicker">${esc(t.resultKicker)}</p>
<p class="big" id="l-big">–</p>
<div class="table-scroll"><table class="compact"><thead><tr><th scope="col">${esc(t.colPeriod)}</th><th scope="col">${esc(t.colTax)}</th><th scope="col">${esc(t.colNet)}</th></tr></thead><tbody id="l-rows"></tbody></table></div>
<p class="note" id="l-note">${esc(t.resultEmpty)}</p>
</div>
<script type="application/json" id="l-strings">${calcStrings}</script>
<noscript><p class="note">${esc(t.noscript)}</p></noscript>
</form>
<script type="module" src="${ASSETS}/i18n-calc.js"></script>`;

  const salaryRows = (s) => {
    const a = fromAnnual(s);
    return PERIODS.map(([p, label]) => ({ p, label, ...payRow(a[p], p) }));
  };

  // ---- home: calculator + newcomer guide + popular salaries ----
  {
    const path = `${base}/`;
    const popular = POPULAR_SALARIES.map((s) => {
      const [w, f, m] = salaryRows(s);
      return `<tr><td><a href="${base}/salary/${s}/">${fmt0(s)}</a></td><td>${fmt(w.net)}</td><td>${fmt(f.net)}</td><td>${fmt(m.net)}</td></tr>`;
    }).join("");
    const guide = [["tfnTitle", "tfnText"], ["residencyTitle", "residencyText"], ["tftTitle", "tftText"], ["superTitle", "superText"], ["medicareTitle", "medicareText"], ["returnTitle", "returnText"]]
      .map(([h, p]) => `<h3>${esc(t[h])}</h3><p>${esc(t[p])}</p>`).join("\n");
    const hero = `<h1>${esc(fill(t.homeH1, { year }))}</h1>
<p class="intro">${esc(t.homeIntro)}</p>
${calculator()}`;
    const body = `${adSlot(`${code}-home`)}
<h2>${esc(t.guideH2)}</h2>
${guide}
<h2>${esc(t.popularH2)}</h2>
<p>${esc(fill(t.popularIntro, { year }))}</p>
<div class="table-scroll"><table><thead><tr><th scope="col">${esc(t.colSalary)}</th><th scope="col">${esc(t.colWeekly)}</th><th scope="col">${esc(t.colFortnightly)}</th><th scope="col">${esc(t.colMonthly)}</th></tr></thead><tbody>${popular}</tbody></table></div>
<p class="more"><a href="/" lang="en">${esc(t.moreInEnglish)}</a></p>`;
    page(path, { title: fill(t.homeTitle, { year }), description: fill(t.homeDescription, { year }), hero, body, jsonld: [{ "@context": "https://schema.org", "@type": "WebApplication", name: fill(t.homeH1, { year }), url: ctx.BASE ? ctx.BASE + path : path, inLanguage: t.htmlLang, applicationCategory: "FinanceApplication", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" } }] });
  }

  // ---- popular salary pages ----
  POPULAR_SALARIES.forEach((s, i) => {
    const path = `${base}/salary/${s}/`;
    const rows = salaryRows(s);
    const [w, f, m] = rows;
    const yearTax = f.tax * 26;
    const superYear = Math.round((s * 100 * SUPER_PER_MILLE) / 1000);
    const r = estimateAnnualTax({ salary: s });
    const c = r.cents;
    const vars = { salary: fmt0(s), fortnight: fmt(f.net), week: fmt(w.net), month: fmt(m.net), tax: fmt(f.tax), year, super: fmt(superYear) };
    const taxRows = [
      ...(r.standardDeductionUsed ? [[t.rowStdDed, `−${fmt(r.workDeductions * 100)}`], [t.rowTaxable, fmt(r.taxableIncome * 100)]] : []),
      [t.rowIncomeTax, fmt(c.grossTax)],
      [t.rowLito, c.lito ? `−${fmt(c.lito)}` : fmt(0)],
      [t.rowMedicare, fmt(c.medicare)],
    ];
    const hero = `<h1>${esc(fill(t.salaryH1, vars))}</h1>
<p class="intro">${esc(fill(t.salaryIntro, vars))}</p>`;
    const nearby = POPULAR_SALARIES.filter((x) => x !== s && Math.abs(POPULAR_SALARIES.indexOf(x) - i) <= 3);
    const body = `<h2>${esc(t.breakdownH2)}</h2>
<div class="table-scroll"><table><caption>${esc(t.breakdownCaption)}</caption><thead><tr><th scope="col">${esc(t.colPeriod)}</th><th scope="col">${esc(t.colGross)}</th><th scope="col">${esc(t.colTax)}</th><th scope="col">${esc(t.colNet)}</th><th scope="col">${esc(t.colSuper)}</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${esc(x.label)}</td><td>${fmt(x.gross)}</td><td>${fmt(x.tax)}</td><td><strong>${fmt(x.net)}</strong></td><td>${fmt(x.superC)}</td></tr>`).join("")}<tr class="total"><td>${esc(t.yearRow)}</td><td>${fmt(s * 100)}</td><td>${fmt(yearTax)}</td><td>${fmt(s * 100 - yearTax)}</td><td>${fmt(superYear)}</td></tr></tbody></table></div>
<p>${esc(fill(t.superLine, vars))}</p>
${adSlot(`${code}-salary`)}
<h2>${esc(t.yearTaxH2)}</h2>
<p>${esc(fill(t.yearTaxIntro, vars))}</p>
<div class="table-scroll"><table><tbody>${taxRows.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${v}</td></tr>`).join("")}
<tr class="total"><td>${esc(t.rowTotal)}</td><td>${fmt(c.totalLiability)}</td></tr>
<tr><td>${esc(t.rowWithheld)}</td><td>${fmt(c.withheld)}</td></tr>
<tr class="total"><td>${esc(c.refund >= 0 ? t.rowRefund : t.rowOwing)}</td><td>${fmt(Math.abs(c.refund))}</td></tr></tbody></table></div>
<h2>${esc(t.otherSalaries)}</h2>
<ul class="links">${nearby.map((x) => `<li><a href="${base}/salary/${x}/">${fmt0(x)}</a></li>`).join("")}</ul>
<p class="more"><a href="/salary/${s}/" lang="en">${esc(t.fullPageEnglish)}</a></p>`;
    page(path, { title: fill(t.salaryTitle, vars), description: fill(t.salaryDescription, vars), hero, body, crumbs: [{ name: fmt0(s), path }] });
  });

  // ---- tax rates ----
  {
    const path = `${base}/tax-rates/`;
    const Y = ANNUAL_YEARS["2026-27"];
    const bracketRows = (list) => list.map((b, i) => {
      const from = b.over === 0 ? 0 : b.over + 1;
      const to = list[i + 1]?.over;
      const range = to ? `${fmt0(from)} – ${fmt0(to)}` : fill(t.andOver, { amount: fmt0(from) });
      const tax = b.rate === 0 ? t.nil : fill(b.base ? t.bracketBase : t.bracketNoBase, { base: fmt0(b.base), rate: b.rate, over: fmt0(b.over) });
      return `<tr><td>${esc(range)}</td><td>${esc(tax)}</td></tr>`;
    }).join("");
    const table = (caption, list) => `<div class="table-scroll"><table><caption>${esc(caption)}, ${year}</caption><thead><tr><th scope="col">${esc(t.colTaxableIncome)}</th><th scope="col">${esc(t.colTaxOnIncome)}</th></tr></thead><tbody>${bracketRows(list)}</tbody></table></div>`;
    const hero = `<h1>${esc(fill(t.ratesH1, { year }))}</h1>
<p class="intro">${esc(fill(t.ratesIntro, { year }))}</p>
${table(t.residentsCaption, Y.residentBrackets)}`;
    const body = `<h2>${esc(t.changesH2)}</h2>
<p>${esc(t.changesText)}</p>
${adSlot(`${code}-rates`)}
<h2>${esc(t.foreignCaption)}</h2>
<p>${esc(t.foreignText)}</p>
${table(t.foreignCaption, Y.foreignBrackets)}
<h2>${esc(t.offsetsH2)}</h2>
<ul>
<li>${esc(t.litoText)}</li>
<li>${esc(t.medicareRateText)}</li>
<li>${esc(fill(t.helpText, { threshold: fmt0(Y.studyLoan.threshold), year }))}</li>
<li>${esc(t.superRateText)}</li>
</ul>
<p class="more"><a href="/tax-rates/" lang="en">${esc(t.moreInEnglish)}</a></p>`;
    page(path, { title: fill(t.ratesTitle, { year }), description: fill(t.ratesDescription, { year }), hero, body, crumbs: [{ name: t.navTaxRates, path }] });
  }
}
