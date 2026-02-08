import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import sequelize from '../../config/database.js';

interface SourceRow {
  source: string;
  source_id: string;
  chunk_count: string;
}

export function registerGetSources(server: McpServer) {
  server.registerTool(
    'get_sources',
    {
      description:
        'Get information about what data sources are loaded in the knowledge base. Returns a list of sources with their types, IDs, and chunk counts.',
      inputSchema: {},
    },
    async () => {
      const results = (await sequelize.query(
        `SELECT source, source_id, COUNT(*) as chunk_count
         FROM knowledge_base
         GROUP BY source, source_id
         ORDER BY source, source_id`,
        { type: 'SELECT' }
      )) as SourceRow[];

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'The knowledge base is empty. Use the load_knowledge_base tool to ingest data.',
            },
          ],
        };
      }

      const totalChunks = results.reduce(
        (sum, r) => sum + parseInt(r.chunk_count),
        0
      );

      const summary = [
        `Knowledge Base Status:`,
        `Total sources: ${results.length}`,
        `Total chunks: ${totalChunks}`,
        ``,
        `Sources:`,
        ...results.map(
          (r) => `  - [${r.source}] ${r.source_id}: ${r.chunk_count} chunks`
        ),
      ].join('\n');

      return {
        content: [{ type: 'text' as const, text: summary }],
      };
    }
  );
}
