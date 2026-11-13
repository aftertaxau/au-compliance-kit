// Plain web API for the agent tools: GET /api/<tool>?field=value or POST /api/<tool> with a JSON body.
// GET suits agents that can only fetch URLs; nested fields use dots (family.spouse=true).
import { TOOLS, TOOLS_BY_NAME, ToolInputError, runTool } from "./tools.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...extra } });

/** Turn query-string text into the types the tool's schema expects. */
export function argsFromQuery(schema, params) {
  const args = {};
  for (const [key, raw] of params) {
    const parts = key.split(".");
    let target = args, s = schema;
    for (let i = 0; i < parts.length - 1; i++) {
      s = s?.properties?.[parts[i]];
      target = target[parts[i]] ??= {};
    }
    const leaf = parts[parts.length - 1];
    const type = s?.properties?.[leaf]?.type;
    let value = raw;
    if (type === "number" || type === "integer") value = raw.trim() === "" ? NaN : Number(raw.replace(/[,$\s]/g, ""));
    else if (type === "boolean") value = raw === "true" || raw === "1" ? true : raw === "false" || raw === "0" ? false : raw;
    target[leaf] = value;
  }
  return args;
}

/**
 * @param {Request} request
 * @param {string} name tool name from the URL
 * @param {{ siteUrl?: string }} [ctx]
 */
export async function handleApiRequest(request, name, ctx = {}) {
  const url = new URL(request.url);
  const siteUrl = ctx.siteUrl ?? url.origin;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (!name) {
    return json({
      description: "Australian pay and tax calculations using the ATO's formulas. GET /api/<tool>?field=value or POST JSON. MCP clients can connect to /mcp instead.",
      openapi: `${siteUrl}/openapi.json`,
      mcp: `${siteUrl}/mcp`,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description, url: `${siteUrl}/api/${t.name}`, inputSchema: t.inputSchema })),
    }, 200, { "Cache-Control": "public, max-age=3600" });
  }
  const tool = TOOLS_BY_NAME[name];
  if (!tool) return json({ error: `Unknown tool ${name}`, tools: TOOLS.map((t) => t.name) }, 404);
  let args;
  if (request.method === "GET") args = argsFromQuery(tool.inputSchema, url.searchParams);
  else if (request.method === "POST") {
    try { args = await request.json(); } catch { return json({ error: "Body must be JSON" }, 400); }
  } else return json({ error: "Use GET or POST" }, 405, { Allow: "GET, POST, OPTIONS" });
  try {
    return json(runTool(name, args, { siteUrl }), 200, request.method === "GET" ? { "Cache-Control": "public, max-age=86400" } : {});
  } catch (err) {
    if (err instanceof ToolInputError) return json({ error: err.message, inputSchema: tool.inputSchema }, 400);
    return json({ error: "Internal error" }, 500);
  }
}
