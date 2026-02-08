import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PDF_FILES, ARTICLE_IDS } from '../../config/constants.js';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readPdf(name: string): Promise<string> {
  if (!PDF_FILES.includes(name)) {
    throw new Error(
      `Unknown PDF: "${name}". Available: ${PDF_FILES.join(', ')}`
    );
  }
  const pdfDir = path.join(__dirname, '..', '..', 'knowledge_pdfs');
  const filePath = path.join(pdfDir, name);
  const fileUrl = pathToFileURL(filePath).href;
  const parser = new PDFParse({ url: fileUrl });
  const data = await parser.getText();
  return data.text;
}

async function readArticle(id: string): Promise<string> {
  const index = ARTICLE_IDS.indexOf(id);
  if (index === -1) {
    throw new Error(
      `Unknown article: "${id}". Available: ${ARTICLE_IDS.join(', ')}`
    );
  }
  const url = `https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-${index + 1}_${id}.md`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch article ${id}: ${response.status}`);
  }
  return response.text();
}

function detectSourceType(
  sourceName: string
): 'pdf' | 'article' | null {
  if (PDF_FILES.includes(sourceName)) return 'pdf';
  if (ARTICLE_IDS.includes(sourceName)) return 'article';
  return null;
}

export function registerReadSource(server: McpServer) {
  server.registerTool(
    'read_source',
    {
      description:
        'Reads the full text content of a PDF or article. Provide the PDF filename or article ID. If sourceType is omitted, it will be auto-detected.',
      inputSchema: {
        sourceName: z
          .string()
          .describe('The PDF filename or article ID to read'),
        sourceType: z
          .enum(['pdf', 'article'])
          .optional()
          .describe(
            "Source type: 'pdf' or 'article'. If omitted, auto-detected from the name."
          ),
      },
    },
    async ({ sourceName, sourceType }) => {
      const type = sourceType ?? detectSourceType(sourceName);

      if (!type) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Could not identify source "${sourceName}". Available PDFs: ${PDF_FILES.join(', ')}. Available articles: ${ARTICLE_IDS.join(', ')}.`,
            },
          ],
          isError: true,
        };
      }

      const content =
        type === 'pdf'
          ? await readPdf(sourceName)
          : await readArticle(sourceName);

      return {
        content: [{ type: 'text' as const, text: content }],
      };
    }
  );
}
