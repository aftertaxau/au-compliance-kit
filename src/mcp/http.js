// MCP over HTTP ("Streamable HTTP" transport, stateless): POST a JSON-RPC message, get JSON back.
// Works with the Fetch API Request/Response, so it runs on Cloudflare Pages/Workers, Deno, Bun,
// Next.js route handlers and Node 18+.
import { handleMessage, SERVER_INFO } from "./server.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

/**
 * @param {Request} request
 * @param {{ siteUrl?: string }} [ctx] defaults siteUrl to the request's origin
 */
export async function handleMcpRequest(request, ctx = {}) {
  const siteUrl = ctx.siteUrl ?? new URL(request.url).origin;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") {
    // No server-to-client event stream: this server only answers requests.
    return new Response(JSON.stringify({
      server: SERVER_INFO,
      transport: "MCP Streamable HTTP (stateless). POST JSON-RPC messages to this URL.",
    }, null, 2), { status: 405, headers: { "Content-Type": "application/json", Allow: "POST, OPTIONS", ...CORS } });
  }
  let message;
  try {
    message = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error: body must be JSON" } }, 400);
  }
  const response = handleMessage(message, { siteUrl });
  if (response === null) return new Response(null, { status: 202, headers: CORS });
  return json(response);
}
