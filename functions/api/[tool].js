// Cloudflare Pages Function: /api/<tool> runs one of the agent tools.
import { handleApiRequest } from "../../src/agent/http.js";
const SITE = "https://aftertaxau.com"; // links in results point to the real domain, even from pages.dev

export const onRequest = ({ request, params }) => handleApiRequest(request, params.tool, { siteUrl: SITE });
