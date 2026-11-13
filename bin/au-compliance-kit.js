#!/usr/bin/env node
// Command line: `au-compliance-kit mcp` runs the MCP server over stdio for Claude, Cursor and other agents.
import { createInterface } from "node:readline";
import { handleMessage, SERVER_INFO } from "../src/mcp/server.js";

const [command] = process.argv.slice(2);

if (command === "mcp") {
  const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  lines.on("line", (line) => {
    if (!line.trim()) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      return;
    }
    const response = handleMessage(message);
    if (response) send(response);
  });
  process.stderr.write(`${SERVER_INFO.name} ${SERVER_INFO.version} MCP server ready on stdio\n`);
} else {
  process.stdout.write(`${SERVER_INFO.name} ${SERVER_INFO.version}

Usage:
  npx -y au-compliance-kit mcp    Run the MCP server (stdio) for AI agents

Add it to Claude Code:
  claude mcp add au-tax -- npx -y au-compliance-kit mcp

Or use it as a library:
  import { calculateWithholding, estimateAnnualTax } from "au-compliance-kit";
`);
  process.exit(command && command !== "help" && command !== "--help" ? 1 : 0);
}
