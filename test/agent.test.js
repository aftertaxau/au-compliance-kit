import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { TOOLS, runTool, ToolInputError } from "../src/agent/tools.js";
import { handleMessage, PROTOCOL_VERSIONS } from "../src/mcp/server.js";
import { handleMcpRequest } from "../src/mcp/http.js";
import { handleApiRequest } from "../src/agent/http.js";
import { onRequest as mcpFunction } from "../functions/mcp.js";
import { onRequest as apiFunction } from "../functions/api/[tool].js";
import { VERSION } from "../src/version.js";

const SITE = "https://pay.example";

test("version matches package.json", () => {
  assert.equal(VERSION, JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version);
});

test("every tool has a name, description and object schema", () => {
  for (const t of TOOLS) {
    assert.match(t.name, /^[a-z_]+$/);
    assert.ok(t.description.length > 60, t.name);
    assert.equal(t.inputSchema.type, "object");
    assert.equal(t.inputSchema.additionalProperties, false);
  }
});

test("take_home_pay matches the salary pages", () => {
  const r = runTool("take_home_pay", { salary: 80000 }, { siteUrl: SITE });
  assert.deepEqual(r.perPay.fortnightly, { grossPay: 3076.92, taxWithheld: 622, takeHomePay: 2454.92, superGuarantee: 369.23 });
  assert.equal(r.year.takeHomePay, 63828);
  assert.equal(r.taxForTheYear.totalTax, 16120);
  assert.equal(r.taxForTheYear.estimatedRefund, 52);
  assert.equal(r.calculatorPage, `${SITE}/salary/80000/`);
  // package including super: $80,000 package -> $2,231.25 a fortnight (as on the salary page)
  assert.equal(runTool("take_home_pay", { salary: 80000, salaryIncludesSuper: true }).perPay.fortnightly.takeHomePay, 2231.25);
  // hourly links to the hourly page; non-default options link to the calculator
  assert.equal(runTool("take_home_pay", { hourlyRate: 35 }, { siteUrl: SITE }).calculatorPage, `${SITE}/hourly/35/`);
  assert.equal(runTool("take_home_pay", { salary: 80000, studyLoan: true }, { siteUrl: SITE }).calculatorPage, `${SITE}/`);
  assert.equal(runTool("take_home_pay", { salary: 400000 }, { siteUrl: SITE }).calculatorPage, `${SITE}/salary/400000/`);
  assert.equal(runTool("take_home_pay", { salary: 405000 }, { siteUrl: SITE }).calculatorPage, `${SITE}/`);
});

test("payg_withholding matches the README example", () => {
  const r = runTool("payg_withholding", { earnings: 2026.77, period: "fortnightly", payDate: "2026-11-13" });
  assert.equal(r.withholding, 284);
  assert.equal(r.scale, 2);
});

test("annual_tax_estimate and tax_rates", () => {
  const r = runTool("annual_tax_estimate", { salary: 90000, deductions: 2500, studyLoan: true });
  assert.equal(r.taxableIncome, 87500);
  assert.equal(r.estimatedRefund, 1196.2);
  const rates = runTool("tax_rates", { taxYear: "2026-27" });
  assert.deepEqual(rates.residentTaxRates[1], { from: 18201, to: 45000, ratePercent: 15, taxOnIncomeBelow: 0 });
  assert.equal(runTool("tax_rates", { taxYear: "2027-28" }).residentTaxRates[1].ratePercent, 14);
});

test("bad input comes back as a fixable error", () => {
  assert.throws(() => runTool("take_home_pay", {}), ToolInputError);
  assert.throws(() => runTool("take_home_pay", { salary: "lots" }), /salary must be a number/);
  assert.throws(() => runTool("payg_withholding", { earnings: 100, period: "daily" }), /period must be one of/);
  assert.throws(() => runTool("payg_withholding", { earnings: 100, period: "weekly", payDate: "2031-01-01" }), ToolInputError);
  assert.throws(() => runTool("nope", {}), /Unknown tool/);
});

test("MCP handshake, tool list and tool call", () => {
  const init = handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } });
  assert.equal(init.result.protocolVersion, "2025-06-18");
  assert.ok(init.result.capabilities.tools);
  assert.equal(handleMessage({ jsonrpc: "2.0", id: 9, method: "initialize", params: { protocolVersion: "1999-01-01" } }).result.protocolVersion, PROTOCOL_VERSIONS[0]);
  assert.equal(handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
  const list = handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.equal(list.result.tools.length, TOOLS.length);
  assert.equal(list.result.tools[0].annotations.readOnlyHint, true);
  const call = handleMessage({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "take_home_pay", arguments: { salary: 80000 } } });
  assert.equal(call.result.structuredContent.perPay.fortnightly.takeHomePay, 2454.92);
  assert.equal(JSON.parse(call.result.content[0].text).year.takeHomePay, 63828);
  const bad = handleMessage({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "take_home_pay", arguments: { salary: -5 } } });
  assert.equal(bad.result.isError, true);
  assert.equal(handleMessage({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "nope" } }).error.code, -32602);
  assert.equal(handleMessage({ jsonrpc: "2.0", id: 6, method: "sampling/whatever" }).error.code, -32601);
  assert.deepEqual(handleMessage({ jsonrpc: "2.0", id: 7, method: "ping" }).result, {});
});

test("remote MCP endpoint over HTTP", async () => {
  const post = (body) => new Request(`${SITE}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify(body) });
  let res = await mcpFunction({ request: post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25" } }) });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  assert.equal((await res.json()).result.serverInfo.name, "au-compliance-kit");
  res = await handleMcpRequest(post({ jsonrpc: "2.0", method: "notifications/initialized" }));
  assert.equal(res.status, 202);
  res = await handleMcpRequest(post({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "take_home_pay", arguments: { salary: 120000 } } }));
  const body = await res.json();
  assert.equal(body.result.structuredContent.calculatorPage, `${SITE}/salary/120000/`);
  res = await mcpFunction({ request: post({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "take_home_pay", arguments: { salary: 120000 } } }) });
  assert.equal((await res.json()).result.structuredContent.calculatorPage, "https://aftertaxau.com/salary/120000/");
  res = await handleMcpRequest(new Request(`${SITE}/mcp`, { method: "GET", headers: { Accept: "text/event-stream" } }));
  assert.equal(res.status, 405);
  res = await handleMcpRequest(new Request(`${SITE}/mcp`, { method: "OPTIONS" }));
  assert.equal(res.status, 204);
  res = await handleMcpRequest(new Request(`${SITE}/mcp`, { method: "POST", body: "not json" }));
  assert.equal((await res.json()).error.code, -32700);
});

test("web API: GET with query string, POST with JSON", async () => {
  let res = await apiFunction({ request: new Request(`${SITE}/api/take_home_pay?salary=85,000&studyLoan=true`), params: { tool: "take_home_pay" } });
  assert.equal(res.status, 200);
  let r = await res.json();
  assert.equal(r.annualSalary, 85000);
  assert.ok(r.taxForTheYear.studyLoanRepayment > 0);
  res = await handleApiRequest(new Request(`${SITE}/api/payg_withholding?earnings=2026.77&period=fortnightly&medicareFamily.spouse=true&medicareFamily.children=2`), "payg_withholding");
  assert.equal(res.status, 200);
  res = await handleApiRequest(new Request(`${SITE}/api/annual_tax_estimate`, { method: "POST", body: JSON.stringify({ salary: 60000, family: { spouse: true, spouseIncome: 20000, dependants: 1 } }) }), "annual_tax_estimate");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).calculatorPage, `${SITE}/tax-refund-calculator/`);
  res = await handleApiRequest(new Request(`${SITE}/api/take_home_pay?salary=abc`), "take_home_pay");
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /salary must be a number/);
  res = await handleApiRequest(new Request(`${SITE}/api/nope`), "nope");
  assert.equal(res.status, 404);
  res = await handleApiRequest(new Request(`${SITE}/api`), "");
  assert.equal((await res.json()).tools.length, TOOLS.length);
});

test("stdio MCP server answers line by line", async () => {
  const child = spawn(process.execPath, [new URL("../bin/au-compliance-kit.js", import.meta.url).pathname, "mcp"], { stdio: ["pipe", "pipe", "pipe"] });
  const lines = [];
  child.stdout.on("data", (d) => lines.push(...d.toString().split("\n").filter(Boolean)));
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }) + "\n");
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  child.stdin.write("{oops\n");
  child.stdin.end(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "validate_au_identifier", arguments: { type: "abn", value: "51 824 753 556" } } }) + "\n");
  await new Promise((resolve) => child.on("close", resolve));
  const msgs = lines.map((l) => JSON.parse(l));
  assert.equal(msgs.length, 3);
  assert.equal(msgs[0].result.serverInfo.name, "au-compliance-kit");
  assert.equal(msgs[1].error.code, -32700);
  assert.equal(msgs[2].result.structuredContent.valid, true);
});
