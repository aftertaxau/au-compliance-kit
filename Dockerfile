# Runs the MCP server over stdio (used by Glama and other MCP hosts that start servers in a container).
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY bin ./bin
USER node
ENTRYPOINT ["node", "bin/au-compliance-kit.js", "mcp"]
