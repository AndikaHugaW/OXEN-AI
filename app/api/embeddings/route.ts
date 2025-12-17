/**
 * Embeddings API Route
 * Generates text embeddings for RAG/Vector Search
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    // Use Gemini embedding model
    const model = genAI.getGenerativeModel({ model: 'embedding-001' });
    
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    
    return NextResponse.json({
      embedding,
      dimensions: embedding.length
    });
  } catch (error) {
    console.error('Embedding error:', error);
    
    // Return a placeholder embedding if the API fails
    // This allows the system to continue working without embeddings
    return NextResponse.json(
      { error: 'Embedding generation failed', embedding: null },
      { status: 500 }
    );
  }
}
