// Cloudflare Pages Function: the remote MCP endpoint at /mcp.
import { handleMcpRequest } from "../src/mcp/http.js";
const SITE = "https://aftertaxau.com"; // links in results point to the real domain, even from pages.dev

export const onRequest = ({ request }) => handleMcpRequest(request, { siteUrl: SITE });
