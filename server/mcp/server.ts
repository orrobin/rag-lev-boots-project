// IMPORTANT: Redirect console.log to stderr BEFORE any other code.
// STDIO MCP servers communicate via stdout — any console.log output
// would corrupt the JSON-RPC message stream.
console.log = (...args: unknown[]) => console.error(...args);

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Resolve the server/ directory and set CWD so migrations and .env work
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');
process.chdir(serverDir);
dotenv.config({ path: path.resolve(serverDir, '.env') });

// Dynamic imports so dotenv is loaded before database.ts runs
async function main() {
  const { McpServer } = await import(
    '@modelcontextprotocol/sdk/server/mcp.js'
  );
  const { StdioServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/stdio.js'
  );
  const { initializeDB } = await import('../config/database.js');
  const { registerRagSearch } = await import('./tools/ask_question.js');
  const { registerLoadKnowledgeBase } = await import(
    './tools/load_knowledge_base.js'
  );
  const { registerGetSources } = await import('./tools/get_sources.js');
  const { registerListKnowledgeSources } = await import(
    './tools/list_knowledge_sources.js'
  );
  const { registerReadSource } = await import('./tools/read_source.js');

  // Initialize DB connection and run migrations
  await initializeDB();

  const server = new McpServer({
    name: 'lev-boots-rag',
    version: '1.0.0',
  });

  // Register all tools
  registerRagSearch(server);
  registerLoadKnowledgeBase(server);
  registerGetSources(server);
  registerListKnowledgeSources(server);
  registerReadSource(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Lev-Boots RAG MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
