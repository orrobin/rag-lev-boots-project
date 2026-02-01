import KnowledgeBase from '../models/KnowledgeBase';
import { loadPDFs, loadArticles, loadAllSlackChannels } from './dataLoader';
import { chunkText, generateEmbeddingsWithRateLimit } from './embeddings';
import { answerQuestion } from './answerService';
import sequelize from '../config/database';

// ============== STORE DATA ==============

async function storeChunks(
  source: string,
  sourceId: string,
  chunks: string[],
  embeddings: number[][]
): Promise<void> {
  for (let i = 0; i < chunks.length; i++) {
    // Use raw SQL to properly format the vector for pgvector
    const embeddingStr = `[${embeddings[i].join(',')}]`;
    await sequelize.query(
      `INSERT INTO knowledge_base (source, source_id, chunk_index, chunk_content, embeddings_768, created_at, updated_at)
       VALUES (:source, :sourceId, :chunkIndex, :chunkContent, :embedding::vector, NOW(), NOW())`,
      {
        replacements: {
          source,
          sourceId,
          chunkIndex: i,
          chunkContent: chunks[i],
          embedding: embeddingStr,
        },
      }
    );
  }
}

async function isSourceAlreadyLoaded(
  source: string,
  sourceId: string
): Promise<boolean> {
  const count = await KnowledgeBase.count({
    where: { source, source_id: sourceId },
  });
  return count > 0;
}

// ============== MAIN LOAD FUNCTION ==============

export const loadAllData = async () => {
  console.log('Starting data loading process...');

  // Check existing data
  const existingCount = await KnowledgeBase.count();
  console.log(`Found ${existingCount} existing records in knowledge base.`);

  let newRecordsAdded = 0;

  // Load PDFs
  console.log('\n=== Loading PDFs ===');
  const pdfs = await loadPDFs();
  for (const pdfDoc of pdfs) {
    if (await isSourceAlreadyLoaded('pdf', pdfDoc.source_id)) {
      console.log(`  [SKIP] ${pdfDoc.source_id} already loaded`);
      continue;
    }

    const chunks = chunkText(pdfDoc.content);
    console.log(`  ${pdfDoc.source_id}: ${chunks.length} chunks`);

    console.log(`    Generating embeddings...`);
    const embeddings = await generateEmbeddingsWithRateLimit(
      chunks,
      (current, total) => {
        if (current % 5 === 0 || current === total) {
          console.log(`    Progress: ${current}/${total}`);
        }
      }
    );

    await storeChunks('pdf', pdfDoc.source_id, chunks, embeddings);
    newRecordsAdded += chunks.length;
  }

  // Load Articles
  console.log('\n=== Loading Articles ===');
  const articles = await loadArticles();
  for (const article of articles) {
    if (await isSourceAlreadyLoaded('article', article.source_id)) {
      console.log(`  [SKIP] ${article.source_id} already loaded`);
      continue;
    }

    const chunks = chunkText(article.content);
    console.log(`  ${article.source_id}: ${chunks.length} chunks`);

    console.log(`    Generating embeddings...`);
    const embeddings = await generateEmbeddingsWithRateLimit(
      chunks,
      (current, total) => {
        if (current % 5 === 0 || current === total) {
          console.log(`    Progress: ${current}/${total}`);
        }
      }
    );

    await storeChunks('article', article.source_id, chunks, embeddings);
    newRecordsAdded += chunks.length;
  }

  // Load Slack
  console.log('\n=== Loading Slack Channels ===');
  const slackData = await loadAllSlackChannels();
  for (const slack of slackData) {
    if (await isSourceAlreadyLoaded('slack', slack.source_id)) {
      console.log(`  [SKIP] ${slack.source_id} already loaded`);
      continue;
    }

    const chunks = chunkText(slack.content);
    console.log(`  ${slack.source_id}: ${chunks.length} chunks`);

    console.log(`    Generating embeddings...`);
    const embeddings = await generateEmbeddingsWithRateLimit(
      chunks,
      (current, total) => {
        if (current % 5 === 0 || current === total) {
          console.log(`    Progress: ${current}/${total}`);
        }
      }
    );

    await storeChunks('slack', slack.source_id, chunks, embeddings);
    newRecordsAdded += chunks.length;
  }

  const totalRecords = await KnowledgeBase.count();
  console.log(`\n=== Data loading complete! ===`);
  console.log(`  New records added: ${newRecordsAdded}`);
  console.log(`  Total records: ${totalRecords}`);
};

// ============== ASK FUNCTION ==============

export const ask = async (userQuestion: string): Promise<string> => {
  return answerQuestion(userQuestion);
};
