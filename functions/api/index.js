// Cloudflare Pages Function: /api lists the tools.
import { handleApiRequest } from "../../src/agent/http.js";
const SITE = "https://aftertaxau.com"; // links in results point to the real domain, even from pages.dev

export const onRequest = ({ request }) => handleApiRequest(request, "", { siteUrl: SITE });
