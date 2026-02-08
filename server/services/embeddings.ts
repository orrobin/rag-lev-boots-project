import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Constants
export const CHUNK_SIZE = 400; // words
export const EMBEDDING_MODEL = 'gemini-embedding-001';

// ============== CHUNKING ==============

export function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE
): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

// ============== EMBEDDING ==============

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });

  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  });
  return result.embedding.values;
}

export async function generateEmbeddingsWithRateLimit(
  texts: string[],
  onProgress?: (current: number, total: number) => void
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    try {
      const embedding = await generateEmbedding(text);
      embeddings.push(embedding);

      if (onProgress) {
        onProgress(i + 1, texts.length);
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error: unknown) {
      console.error('Error generating embedding:', error);

      // If rate limited, wait longer and retry
      if (error instanceof Error && error.message?.includes('429')) {
        console.log('    Rate limited, waiting 60 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 60000));
        const embedding = await generateEmbedding(text);
        embeddings.push(embedding);
      } else {
        throw error;
      }
    }
  }

  return embeddings;
}
