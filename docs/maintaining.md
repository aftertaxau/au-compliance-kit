# Maintaining au-compliance-kit and aftertaxau.com

## Develop

```
npm test             # runs the ATO sample-data tests
npm run build:site   # renders the free calculator site (473 static pages, llms.txt, openapi.json) into dist/
SITE_URL=https://preview.example npm run build:site   # canonical URLs and sitemap default to https://aftertaxau.com
python3 -I scripts/make-icons.py   # redraws the favicons and logo-512.png in site/static/ after a logo change (needs Pillow)
```

## Deploy (Cloudflare Pages, free)

Deploy from the repository root so Cloudflare picks up `functions/`, which serves the MCP endpoint (`/mcp`) and the JSON API (`/api/<tool>`) alongside the static pages:

```
npm run build:site
npx wrangler pages deploy dist
node scripts/indexnow.mjs   # tell Bing and other IndexNow search engines about every page in the sitemap
```

The free plan allows 100,000 function requests a day; the static pages are unlimited. The build also writes `llms.txt` (a plain-text map of the site and its key figures for AI assistants), `openapi.json` and a `robots.txt` that allows all crawlers. When you add the domain to Cloudflare, check that its AI crawler blocking is off (Security → Bots: "Block AI bots" and the managed robots.txt), or ChatGPT, Claude and Perplexity can't read or cite the site.

## Releasing

Bump the version in `package.json`, `server.json` (both `version` fields) and `src/version.js`, commit, then push a tag:

```
git tag v0.2.1 && git push origin v0.2.1
```

The Release workflow runs the tests, publishes to npm with trusted publishing and publishes `server.json` to the MCP Registry. No tokens are stored in the repo.

## Ads (Google AdSense)

Ads are off by default. `npm run build:site:ads-preview` shows grey placeholders where ads go. Once AdSense approves the site, create one responsive display ad unit and build with:

```
ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX ADSENSE_SLOT=1234567890 npm run build:site
```

That adds the AdSense script, fills the ad slots (with space reserved so pages don't jump) and writes `ads.txt`. In AdSense, turn off anchor and vignette auto ads: anchor ads would cover the phone result bar.

The ATO sample data fixture is regenerated with `python3 -I scripts/extract-ato-samples.py <LI 2026/18 text> test/fixtures/ato-schedule1-2026-27-samples.json`.

