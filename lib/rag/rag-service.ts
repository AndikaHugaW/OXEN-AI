import { createClient } from '@/lib/supabase/client';
import { getEmbedding } from '@/lib/llm/embeddings';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
 * Generate embedding for text
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // Use the server-side utility
  return await getEmbedding(text);
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
    ids?: string[];
  } = {}
): Promise<Document[]> {
  try {
    let supabase;
    try {
      const cookieStore = await cookies();
      supabase = createServerSupabaseClient(cookieStore);
    } catch (e) {
      supabase = createClient();
    }
    
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

    if (options.ids && options.ids.length > 0) {
      // Manual filter in code if rpc doesn't support it directly
      // Or we can add it to rpc if we have access to database schema
      const filtered = (data || []).filter((doc: any) => options.ids?.includes(doc.id));
      return filtered;
    }
    
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
    let supabase;
    try {
      const cookieStore = await cookies();
      supabase = createServerSupabaseClient(cookieStore);
    } catch (e) {
      supabase = createClient();
    }
    
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
 * 🔧 FIX: Increased content limit and added direct ID fetch
 */
export async function buildRAGContext(
  query: string,
  userId?: string,
  ids?: string[]
): Promise<RAGContext> {
  console.log('📚 [RAG] Building context...', { query: query.substring(0, 50), userId, ids });
  
  // 🔧 PRIORITY PATH: If specific document IDs are provided, fetch them DIRECTLY
  // This bypasses vector search which may fail to match
  if (ids && ids.length > 0) {
    console.log('📚 [RAG] Fetching documents by ID:', ids);
    const directDocs = await fetchDocumentsByIds(ids, userId);
    
    if (directDocs.length > 0) {
      console.log(`✅ [RAG] Found ${directDocs.length} documents by direct ID fetch`);
      
      // Build context with MUCH MORE content for data files
      const contextText = directDocs
        .map((doc, index) => {
          // For data files (CSV, spreadsheet), include up to 15000 chars
          const isDataFile = /\.(csv|xlsx?|txt)$/i.test(doc.title) || 
                            doc.content.includes('[Kolom:') ||
                            doc.content.includes('[Data dari');
          const maxLength = isDataFile ? 15000 : 4000;
          const truncated = doc.content.length > maxLength;
          const content = doc.content.substring(0, maxLength);
          
          return `[Document ${index + 1}: ${doc.title}]\n${content}${truncated ? '\n\n... [Konten dipotong karena terlalu panjang]' : ''}`;
        })
        .join('\n\n---\n\n');
      
      return {
        documents: directDocs,
        contextText: `
📄 DATA DOKUMEN YANG DI-UPLOAD USER (GUNAKAN DATA INI UNTUK MENJAWAB):

${contextText}

---
⚠️ PENTING: Jawab HANYA berdasarkan data di atas. JANGAN mengarang angka atau fakta.
`,
        hasRelevantDocs: true
      };
    }
  }
  
  // Fallback: Vector/text search for general queries
  const documents = await searchRelevantDocuments(query, {
    userId,
    matchThreshold: 0.5, // 🔧 Lowered threshold for better recall
    matchCount: 3,
    ids
  });
  
  console.log(`📚 [RAG] Vector search found ${documents.length} documents`);
  
  if (documents.length === 0) {
    return {
      documents: [],
      contextText: '',
      hasRelevantDocs: false
    };
  }
  
  // Build context text from documents with increased limit
  const contextText = documents
    .map((doc, index) => {
      const isDataFile = /\.(csv|xlsx?|txt)$/i.test(doc.title) || 
                        doc.content.includes('[Kolom:');
      const maxLength = isDataFile ? 15000 : 4000;
      const truncated = doc.content.length > maxLength;
      return `[Document ${index + 1}: ${doc.title}]\n${doc.content.substring(0, maxLength)}${truncated ? '\n... [Truncated]' : ''}`;
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
 * Fetch documents directly by IDs (bypasses vector search)
 */
async function fetchDocumentsByIds(ids: string[], userId?: string): Promise<Document[]> {
  console.log('🔍 [RAG] fetchDocumentsByIds called with:', { ids, userId });
  
  try {
    let supabase;
    try {
      const cookieStore = await cookies();
      supabase = createServerSupabaseClient(cookieStore);
    } catch (e) {
      supabase = createClient();
    }
    
    // Simple query - just fetch by ID without user filter
    // (RLS on Supabase should handle access control)
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, content, user_id')
      .in('id', ids);
    
    if (error) {
      console.error('❌ [RAG] Direct fetch error:', error);
      return [];
    }
    
    console.log(`📚 [RAG] Direct fetch returned ${data?.length || 0} documents`);
    
    // Log first 200 chars of each document content for debugging
    if (data && data.length > 0) {
      data.forEach((doc: any, i: number) => {
        console.log(`📄 [RAG] Doc ${i + 1}: ${doc.title}`);
        console.log(`   Content preview: ${(doc.content || '').substring(0, 200)}...`);
        console.log(`   Content length: ${(doc.content || '').length} chars`);
      });
    } else {
      console.warn('⚠️ [RAG] No documents found for IDs:', ids);
    }
    
    return (data || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content || '',
      similarity: 1.0
    }));
  } catch (err) {
    console.error('❌ [RAG] Direct fetch error:', err);
    return [];
  }
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
    // Use Server Client if possible (to respect RLS)
    let supabase;
    try {
      const cookieStore = await cookies();
      supabase = createServerSupabaseClient(cookieStore);
    } catch (e) {
      // Fallback for non-Next environment
      supabase = createClient();
    }
    
    // Generate embedding for the content (Gemini has a limit, getEmbedding handles truncation)
    const embedding = await generateEmbedding(content);
    
    // Chunk content for better retrieval
    const chunks = chunkContent(content, 500);
    
    // Safety: Limit content size for database column (Postgres TEXT is large, but let's be sane)
    const safeContent = content.length > 100000 ? content.substring(0, 100000) + "... [Truncated]" : content;

    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title,
        content: safeContent,
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
    let supabase;
    try {
      const cookieStore = await cookies();
      supabase = createServerSupabaseClient(cookieStore);
    } catch (e) {
      supabase = createClient();
    }
    
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
