# au-compliance-kit

Australian payroll and tax compliance calculations for software (and the AI agents writing it). Zero dependencies.

Live calculators built on it: **[aftertaxau.com](https://aftertaxau.com)**.

```
npm install au-compliance-kit
```

- **PAYG withholding for 2025–26 and 2026–27**: ATO Schedule 1 (NAT 1004), scales 1–6, weekly, fortnightly, monthly and quarterly pays, tax offsets and the Medicare levy adjustment, picked by pay date. Tested against all 432 rows of the ATO's published sample data for each year.
- **Seniors and pensioners**: the seniors and pensioners tax offset (SAPTO) with the ATO's income tests, Schedule 9 withholding for singles, couples and illness-separated couples, and the higher SAPTO Medicare levy thresholds. Checked against the ATO's worked examples.
- **Bonuses and overtime**: Schedule 5 Method A withholding on bonuses and commissions (checked against the ATO's worked example), and overtime pay.
- **Study loan withholding (Schedule 8, 2026–27)**: HELP/VSL/SSL/AASL component on each pay, checked against the ATO's worked examples.
- **Annual tax estimate for 2025–26, 2026–27 and 2027–28 (estimate)**: income tax (resident and foreign), low income tax offset, Medicare levy (including the family reduction for couples and sole parents), Medicare levy surcharge (single and family thresholds), compulsory study loan repayments, and the refund or bill against tax withheld. Tested against ATO examples.
- **Validators**: ABN, ACN and TFN check digits; BSB and account number formats.

Exact integer arithmetic is used throughout, so results match the ATO's rounding rules to the dollar.

## For AI agents (MCP server)

AI models trained before 1 July 2026 don't know this year's tax rates, and PAYG withholding uses the ATO's own formulas and rounding rather than the tax brackets. This package includes a Model Context Protocol server so Claude, ChatGPT, Cursor and other agents calculate instead of guessing.

```
claude mcp add au-tax -- npx -y au-compliance-kit mcp
```

Other MCP clients:

```json
{ "mcpServers": { "au-tax": { "command": "npx", "args": ["-y", "au-compliance-kit", "mcp"] } } }
```

Tools: `take_home_pay`, `payg_withholding`, `bonus_withholding`, `annual_tax_estimate`, `super_guarantee`, `validate_au_identifier` and `tax_rates`. All are read-only and need no network or API key. The same tools are served over HTTP by the calculator site (`/mcp` for MCP clients, `/api/<tool>` as plain JSON, `/openapi.json` for custom GPT actions), and you can mount them in your own app:

```js
import { handleMcpRequest } from "au-compliance-kit/mcp/http"; // Fetch API Request -> Response (Workers, Next.js, Deno, Node 18+)
import { runTool, TOOLS } from "au-compliance-kit/tools";       // or call the tools directly
```

## Use

```js
import { calculateWithholding, estimateAnnualTax, validateAbn } from "au-compliance-kit";

calculateWithholding({ earnings: 2026.77, period: "fortnightly", payDate: "2026-11-13" });

estimateAnnualTax({ salary: 90000, deductions: 2500, studyLoan: true });
// { taxableIncome: 87500, cents: { grossTax: 1677000, medicare: 175000, studyLoan: 269580, withheld: 2241200, refund: 119620, ... } }
// { withholding: 284, scale: 2, breakdown: { scaleAmount: 284, taxOffset: 0, medicareAdjustment: 0 }, source: "..." }

validateAbn("51 824 753 556"); // { valid: true, normalised: "51 824 753 556" }
```

`calculateWithholding` throws for pay dates outside 1 July 2026 – 30 June 2027 rather than silently using the wrong year's tables, and for working holiday makers (Schedule 15, not yet supported).

## Not covered yet

Working holiday makers (Schedule 15), back payments (Schedule 5 Method B), study loan withholding for pays before 24 September 2025, termination payments, daily and casual tables, Payday Super calculations, STP Phase 2 reports, and Fair Work award rates.

## Develop

```
npm test             # runs the ATO sample-data tests
npm run build:site   # renders the free calculator site (473 static pages, llms.txt, openapi.json) into dist/
SITE_URL=https://preview.example npm run build:site   # canonical URLs and sitemap default to https://aftertaxau.com
python3 -I scripts/make-icons.py   # redraws the favicons and logo-512.png in site/static/ after a logo change (needs Pillow)
```

### Deploy (Cloudflare Pages, free)

Deploy from the repository root so Cloudflare picks up `functions/`, which serves the MCP endpoint (`/mcp`) and the JSON API (`/api/<tool>`) alongside the static pages:

```
npm run build:site
npx wrangler pages deploy dist
node scripts/indexnow.mjs   # tell Bing and other IndexNow search engines about every page in the sitemap
```

The free plan allows 100,000 function requests a day; the static pages are unlimited. The build also writes `llms.txt` (a plain-text map of the site and its key figures for AI assistants), `openapi.json` and a `robots.txt` that allows all crawlers. When you add the domain to Cloudflare, check that its AI crawler blocking is off (Security → Bots: "Block AI bots" and the managed robots.txt), or ChatGPT, Claude and Perplexity can't read or cite the site.

### Ads (Google AdSense)

Ads are off by default. `npm run build:site:ads-preview` shows grey placeholders where ads go. Once AdSense approves the site, create one responsive display ad unit and build with:

```
ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX ADSENSE_SLOT=1234567890 npm run build:site
```

That adds the AdSense script, fills the ad slots (with space reserved so pages don't jump) and writes `ads.txt`. In AdSense, turn off anchor and vignette auto ads: anchor ads would cover the phone result bar.

The ATO sample data fixture is regenerated with `python3 -I scripts/extract-ato-samples.py <LI 2026/18 text> test/fixtures/ato-schedule1-2026-27-samples.json`.

## Disclaimer

General information, not tax advice. Not affiliated with or endorsed by the Australian Taxation Office. ATO material is used under its copyright terms, which allow copying and adaptation without implying endorsement.
