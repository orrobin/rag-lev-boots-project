import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadAllData } from '../../services/ragService.js';

export function registerLoadKnowledgeBase(server: McpServer) {
  server.registerTool(
    'load_knowledge_base',
    {
      description:
        'Load and ingest all data sources (PDFs, articles, Slack messages) into the knowledge base. Chunks the text, generates embeddings, and stores them in the vector database. Skips sources that are already loaded.',
      inputSchema: {},
    },
    async () => {
      await loadAllData();
      return {
        content: [
          {
            type: 'text' as const,
            text: 'Knowledge base loaded successfully. All data sources have been ingested.',
          },
        ],
      };
    }
  );
}
