import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { generateEmbedding } from './embeddings';
import sequelize from '../config/database';

dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// LLM Model for answer generation
const LLM_MODEL = 'gemini-2.5-flash';

interface SearchResult {
  source: string;
  source_id: string;
  chunk_content: string;
  similarity: number;
}

export async function findRelevantChunks(
  questionEmbedding: number[],
  limit: number = 5
): Promise<SearchResult[]> {
  // Perform similarity search using pgvector
  // Using cosine distance (<=>) operator
  const results = (await sequelize.query(
    `
    SELECT
      source,
      source_id,
      chunk_content,
      1 - (embeddings_768 <=> :embedding::vector) as similarity
    FROM knowledge_base
    WHERE embeddings_768 IS NOT NULL
    ORDER BY embeddings_768 <=> :embedding::vector
    LIMIT :limit
    `,
    {
      replacements: {
        embedding: `[${questionEmbedding.join(',')}]`,
        limit,
      },
      type: 'SELECT',
    }
  )) as SearchResult[];

  return results;
}

export async function generateAnswer(
  userQuestion: string,
  context: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: LLM_MODEL,
  });

  const prompt = `You are a helpful assistant that answers questions about Lev-Boots technology based ONLY on the provided context. If the context doesn't contain enough information to answer the question, say so clearly.

CONTEXT:
${context}

USER QUESTION:
${userQuestion}

INSTRUCTIONS:
- Answer based ONLY on the information provided in the context above
- If the context doesn't contain relevant information, say "I couldn't find any information in your resources about that topic."
- Be concise and direct
- Do not make up or hallucinate any information not present in the context

ANSWER:`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function answerQuestion(userQuestion: string): Promise<string> {
  console.log(`\nProcessing question: "${userQuestion}"`);

  // Generate embedding for the question
  const questionEmbedding = await generateEmbedding(userQuestion);

  // Find relevant chunks
  const results = await findRelevantChunks(questionEmbedding);

  if (results.length === 0) {
    return "I don't have enough information in my knowledge base to answer this question.";
  }

  // Build context from retrieved chunks
  const context = results
    .map(
      (r, i) =>
        `[Source ${i + 1}: ${r.source} - ${r.source_id}]\n${r.chunk_content}`
    )
    .join('\n\n---\n\n');

  console.log(`Found ${results.length} relevant chunks`);
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.source}/${r.source_id} (similarity: ${r.similarity.toFixed(3)})`);
  });

  // Generate answer
  const answer = await generateAnswer(userQuestion, context);

  return answer;
}
