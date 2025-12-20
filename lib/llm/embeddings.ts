import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generate embedding for text using Gemini
 * Works on server side without fetch
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY is missing, cannot generate embeddings');
      return null;
    }

    // Truncate text if it's too long (Gemini embedding limit is around 2k-3k tokens)
    // Roughly 8000 characters to be safe
    const truncatedText = text.substring(0, 8000);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    
    const result = await model.embedContent(truncatedText);
    return result.embedding.values;
  } catch (error) {
    console.error('❌ Embedding generation error:', error);
    return null;
  }
}
