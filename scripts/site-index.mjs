// Which pages we ask Google to index.
//
// About 1,000 of the site's pages are templates: one per salary, hourly rate, weekly or fortnightly
// amount, job, rent area, plus translated salary pages. Two weeks after launch Google had crawled only
// half of the site, and the template pages earned very few impressions. Google judges quality across a
// whole site, so a site made mostly of near-identical template pages can drag down its guides and
// calculators too.
//
// Template pages therefore stay live for visitors but carry noindex and are left out of the sitemap.
// The exception is a template page Search Console showed people finding: one with a click, or 10+
// impressions, from 13 to 23 Nov 2026. Every page that isn't a template (calculators, guides, tax
// tables, the section index pages, translated calculator and tax rates pages) is indexed as usual.

const TEMPLATE = /^\/(?:(?:zh|hi|ne|vi|ko)\/)?(?:salary|hourly|weekly|fortnightly|jobs|rent)\/.+\/$/;

export const KEEP_INDEXED = new Set([
  ...[300, 350, 400, 500, 600, 1100, 1200, 1250, 1300, 1500, 1800, 1900, 2000, 2100, 2700].map((n) => `/weekly/${n}/`),
  ...[1000, 1100, 1400, 1900, 2300, 2500, 2600, 2800, 3000, 3100, 3200, 3400, 3900, 4200, 4700, 5100, 5200].map((n) => `/fortnightly/${n}/`),
  ...[26000, 38000, 39000, 60000, 65000, 87000, 100000, 120000, 150000].map((n) => `/salary/${n}/`),
  ...["police", "registered-nurses", "veterinarians", "general-practitioners-and-resident-medical-officers"].map((s) => `/jobs/${s}/`),
]);

/** True if Google should index this page (it goes in the sitemap and has no noindex tag). */
export const isIndexable = (path) => !TEMPLATE.test(path) || KEEP_INDEXED.has(path);
