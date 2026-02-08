import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ask } from '../../services/ragService.js';

export function registerRagSearch(server: McpServer) {
  server.registerTool(
    'rag_search',
    {
      description:
        'Ask a question about Lev-Boots technology. Uses RAG (Retrieval-Augmented Generation) to search the knowledge base and generate an answer based on relevant documents.',
      inputSchema: {
        question: z
          .string()
          .describe('The question to ask about Lev-Boots technology'),
      },
    },
    async ({ question }) => {
      const answer = await ask(question);
      return {
        content: [{ type: 'text' as const, text: answer }],
      };
    }
  );
}
