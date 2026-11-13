// Model Context Protocol (MCP) server core: answers JSON-RPC messages with the agent tools.
// Transport-free, so the same code serves stdio (bin/au-compliance-kit.js mcp) and HTTP (src/mcp/http.js).
import { TOOLS, AGENT_INSTRUCTIONS, ToolInputError, runTool } from "../agent/tools.js";
import { VERSION } from "../version.js";

export const SERVER_INFO = { name: "au-compliance-kit", title: "Australian pay and tax (ATO formulas)", version: VERSION };
export const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const toolList = TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema, annotations: { title, ...READ_ONLY } }));

const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/**
 * Handle one JSON-RPC message (or a batch). Returns the response, or null when nothing should be
 * sent back (notifications and responses from the client).
 * @param {any} message parsed JSON
 * @param {{ siteUrl?: string }} [ctx] siteUrl adds links to the matching calculator pages
 */
export function handleMessage(message, ctx = {}) {
  if (Array.isArray(message)) {
    const out = message.map((m) => handleMessage(m, ctx)).filter(Boolean);
    return out.length ? out : null;
  }
  if (!message || typeof message !== "object" || message.jsonrpc !== "2.0") return fail(null, -32600, "Invalid request: expected a JSON-RPC 2.0 message");
  const { id, method, params } = message;
  if (method === undefined) return null; // a response to something we sent; we never send requests
  const isNotification = id === undefined;
  if (isNotification) return null; // notifications/initialized, notifications/cancelled, ...
  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      return ok(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: AGENT_INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: toolList });
    case "tools/call": {
      const name = params?.name;
      if (typeof name !== "string") return fail(id, -32602, "tools/call needs params.name");
      try {
        const result = runTool(name, params.arguments ?? {}, ctx);
        return ok(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result });
      } catch (err) {
        if (err instanceof ToolInputError) {
          if (err.message.startsWith("Unknown tool")) return fail(id, -32602, err.message);
          return ok(id, { content: [{ type: "text", text: err.message }], isError: true });
        }
        return fail(id, -32603, "Internal error");
      }
    }
    case "resources/list":
      return ok(id, { resources: [] });
    case "prompts/list":
      return ok(id, { prompts: [] });
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}
