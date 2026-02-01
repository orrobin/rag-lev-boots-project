import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============== PDF LOADING ==============

export async function loadPDFs(): Promise<
  { source_id: string; content: string }[]
> {
  const pdfDir = path.join(__dirname, '..', 'knowledge_pdfs');
  const pdfFiles = [
    'OpEd - A Revolution at Our Feet.pdf',
    'Research Paper - Gravitational Reversal Physics.pdf',
    'White Paper - The Development of Localized Gravity Reversal Technology.pdf',
  ];

  const results: { source_id: string; content: string }[] = [];

  for (const pdfFile of pdfFiles) {
    const filePath = path.join(pdfDir, pdfFile);
    const fileUrl = pathToFileURL(filePath).href;
    console.log(`  Loading PDF: ${pdfFile}`);

    const parser = new PDFParse({ url: fileUrl });
    const data = await parser.getText();

    results.push({
      source_id: pdfFile,
      content: data.text,
    });
  }

  return results;
}

// ============== ARTICLE LOADING ==============

export async function loadArticles(): Promise<
  { source_id: string; content: string }[]
> {
  const articleIds = [
    'military-deployment-report',
    'urban-commuting',
    'hover-polo',
    'warehousing',
    'consumer-safety',
  ];

  const results: { source_id: string; content: string }[] = [];

  for (let i = 0; i < articleIds.length; i++) {
    const articleId = articleIds[i];
    const url = `https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-${i + 1}_${articleId}.md`;

    console.log(`  Fetching article: ${articleId}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch article ${articleId}: ${response.status}`
      );
    }

    const content = await response.text();
    results.push({
      source_id: articleId,
      content,
    });
  }

  return results;
}

// ============== SLACK LOADING ==============

interface SlackItem {
  id: string;
  channel: string;
  user: string;
  role: string;
  ts: string;
  text: string;
  thread_ts: string;
}

interface SlackResponse {
  channel: string;
  page: number;
  limit: number;
  total: number;
  items: SlackItem[];
}

async function loadSlackChannel(
  channel: string
): Promise<{ source_id: string; content: string }[]> {
  const results: { source_id: string; content: string }[] = [];
  let page = 1;
  let hasNext = true;

  console.log(`  Fetching Slack channel: ${channel}`);

  while (hasNext) {
    const url = `https://lev-boots-slack-api.jona-581.workers.dev/?channel=${channel}&page=${page}`;

    const response = await fetch(url);
    if (!response.ok) {
      // If rate limited, wait and retry
      if (response.status === 429) {
        console.log('    Slack API rate limited, waiting 5 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      throw new Error(
        `Failed to fetch Slack channel ${channel}: ${response.status}`
      );
    }

    const data: SlackResponse = await response.json();
    const totalPages = Math.ceil(data.total / data.limit);

    // Combine messages into a single content string for this page
    const pageContent = data.items
      .map((item) => `${item.user}: ${item.text}`)
      .join('\n');

    if (pageContent.trim().length > 0) {
      results.push({
        source_id: `${channel}-page-${page}`,
        content: pageContent,
      });
    }

    console.log(`    Page ${page}/${totalPages}`);
    hasNext = page * data.limit < data.total;
    page++;

    // Small delay to be nice to the API
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
}

export async function loadAllSlackChannels(): Promise<
  { source_id: string; content: string }[]
> {
  const channels = ['lab-notes', 'engineering', 'offtopic'];
  const allResults: { source_id: string; content: string }[] = [];

  for (const channel of channels) {
    const channelResults = await loadSlackChannel(channel);
    allResults.push(...channelResults);
  }

  return allResults;
}
