import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PDF_FILES, ARTICLE_IDS } from '../../config/constants.js';

export function registerListKnowledgeSources(server: McpServer) {
  server.registerTool(
    'list_knowledge_sources',
    {
      description:
        'Lists all available PDFs and articles in the knowledge base.',
      inputSchema: {},
    },
    async () => {
      const result = {
        pdfs: PDF_FILES.map((name) => ({ type: 'pdf', name })),
        articles: ARTICLE_IDS.map((id) => ({ type: 'article', id })),
      };

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );
}
