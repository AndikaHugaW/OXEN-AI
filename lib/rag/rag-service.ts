/**
 * RAG (Retrieval Augmented Generation) Service
 * Enables AI to answer questions based on internal business documents
 */

import { createClient } from '@/lib/supabase/client';

interface Document {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

interface RAGContext {
  documents: Document[];
  contextText: string;
  hasRelevantDocs: boolean;
}

/**
 * Generate embedding for text using a simple approach
 * Note: In production, use OpenAI embeddings or similar service
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    // Option 1: Use Supabase Edge Function for embeddings
    // Option 2: Use OpenAI embeddings API
    // For now, we'll create a placeholder that can be replaced
    
    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      console.warn('Embedding API not available, skipping RAG');
      return null;
    }
    
    const data = await response.json();
    return data.embedding;
  } catch (err) {
    console.error('Embedding generation error:', err);
    return null;
  }
}

/**
 * Search for relevant documents based on query
 */
export async function searchRelevantDocuments(
  query: string,
  options: {
    userId?: string;
    matchThreshold?: number;
    matchCount?: number;
    docTypes?: string[];
  } = {}
): Promise<Document[]> {
  try {
    const supabase = createClient();
    
    // Generate embedding for the query
    const embedding = await generateEmbedding(query);
    
    if (!embedding) {
      // Fallback to text-based search if embedding fails
      return await textBasedSearch(query, options);
    }
    
    // Use vector similarity search
    const { data, error } = await supabase.rpc('search_documents', {
      query_embedding: embedding,
      match_threshold: options.matchThreshold || 0.7,
      match_count: options.matchCount || 5,
      filter_user_id: options.userId || null
    });
    
    if (error) {
      console.error('Vector search error:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Document search error:', err);
    return [];
  }
}

/**
 * Fallback text-based search using PostgreSQL full-text search
 */
async function textBasedSearch(
  query: string,
  options: {
    userId?: string;
    matchCount?: number;
    docTypes?: string[];
  } = {}
): Promise<Document[]> {
  try {
    const supabase = createClient();
    
    let queryBuilder = supabase
      .from('documents')
      .select('id, title, content')
      .or(`is_public.eq.true${options.userId ? `,user_id.eq.${options.userId}` : ''}`);
    
    if (options.docTypes && options.docTypes.length > 0) {
      queryBuilder = queryBuilder.in('doc_type', options.docTypes);
    }
    
    // Simple text search
    queryBuilder = queryBuilder.textSearch('content', query, {
      type: 'websearch',
      config: 'indonesian' // Use Indonesian text search config
    });
    
    const { data, error } = await queryBuilder.limit(options.matchCount || 5);
    
    if (error) {
      console.error('Text search error:', error);
      return [];
    }
    
    return (data || []).map((doc: any) => ({
      ...doc,
      similarity: 0.5 // Placeholder similarity for text search
    }));
  } catch (err) {
    console.error('Text search error:', err);
    return [];
  }
}

/**
 * Build RAG context from relevant documents
 */
export async function buildRAGContext(
  query: string,
  userId?: string
): Promise<RAGContext> {
  const documents = await searchRelevantDocuments(query, {
    userId,
    matchThreshold: 0.65,
    matchCount: 3
  });
  
  if (documents.length === 0) {
    return {
      documents: [],
      contextText: '',
      hasRelevantDocs: false
    };
  }
  
  // Build context text from documents
  const contextText = documents
    .map((doc, index) => {
      return `[Document ${index + 1}: ${doc.title}]\n${doc.content.substring(0, 1000)}${doc.content.length > 1000 ? '...' : ''}`;
    })
    .join('\n\n---\n\n');
  
  return {
    documents,
    contextText: `
Berikut adalah informasi yang relevan dari dokumen internal:

${contextText}

---
Gunakan informasi di atas untuk menjawab pertanyaan user jika relevan.
`,
    hasRelevantDocs: true
  };
}

/**
 * Add document to RAG database
 */
export async function addDocument(
  userId: string,
  title: string,
  content: string,
  options: {
    docType?: string;
    isPublic?: boolean;
    metadata?: Record<string, any>;
  } = {}
): Promise<string | null> {
  try {
    const supabase = createClient();
    
    // Generate embedding for the content
    const embedding = await generateEmbedding(content);
    
    // Chunk content for better retrieval
    const chunks = chunkContent(content, 500);
    
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title,
        content,
        content_chunks: chunks,
        embedding: embedding,
        doc_type: options.docType || 'general',
        is_public: options.isPublic || false,
        metadata: options.metadata || {}
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Add document error:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (err) {
    console.error('Add document error:', err);
    return null;
  }
}

/**
 * Chunk content into smaller pieces for better retrieval
 */
function chunkContent(content: string, chunkSize: number = 500): string[] {
  const sentences = content.split(/[.!?]\s+/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Delete document from RAG database
 */
export async function deleteDocument(userId: string, documentId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Delete document error:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Delete document error:', err);
    return false;
  }
}

/**
 * List user's documents
 */
export async function listDocuments(
  userId: string,
  options: { includePublic?: boolean; docType?: string } = {}
): Promise<any[]> {
  try {
    const supabase = createClient();
    
    let queryBuilder = supabase
      .from('documents')
      .select('id, title, doc_type, is_public, created_at, updated_at');
    
    if (options.includePublic) {
      queryBuilder = queryBuilder.or(`user_id.eq.${userId},is_public.eq.true`);
    } else {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }
    
    if (options.docType) {
      queryBuilder = queryBuilder.eq('doc_type', options.docType);
    }
    
    const { data, error } = await queryBuilder.order('created_at', { ascending: false });
    
    if (error) {
      console.error('List documents error:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('List documents error:', err);
    return [];
  }
}
