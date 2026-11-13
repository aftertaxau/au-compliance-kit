// Tells Bing (and other IndexNow search engines) about every page in dist/sitemap.xml, so new and
// changed pages get crawled within days instead of weeks. Run after a deploy: node scripts/indexnow.mjs
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("..", import.meta.url);
const keyFile = readdirSync(new URL("site/static/", root)).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("No IndexNow key file (32 hex characters + .txt) in site/static/");
const key = keyFile.replace(/\.txt$/, "");
const urls = [...readFileSync(new URL("dist/sitemap.xml", root), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const host = new URL(urls[0]).host;

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList: urls }),
});
console.log(`IndexNow: submitted ${urls.length} URLs for ${host}: HTTP ${res.status} ${res.statusText}`);
if (!res.ok && res.status !== 202) console.log(await res.text());
