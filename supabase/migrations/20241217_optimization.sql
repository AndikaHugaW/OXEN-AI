-- ==================================================
-- OXEN AI - Database Optimization Schema
-- ==================================================
-- Run this in Supabase SQL Editor

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For text similarity

-- ==================================================
-- 2. RESPONSE CACHE TABLE
-- Cache AI responses for identical queries
-- ==================================================

CREATE TABLE IF NOT EXISTS public.response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL UNIQUE, -- SHA256 hash of normalized query
    query_text TEXT NOT NULL,
    response_text TEXT NOT NULL,
    model_used TEXT DEFAULT 'gemini-2.0-flash',
    token_count INTEGER DEFAULT 0,
    hit_count INTEGER DEFAULT 1, -- How many times this cache was used
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') -- Cache expires after 7 days
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_response_cache_hash ON public.response_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_response_cache_expires ON public.response_cache(expires_at);

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM public.response_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- 3. DOCUMENTS TABLE FOR RAG (Vector Search)
-- Store business documents with embeddings
-- ==================================================

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_chunks TEXT[], -- Chunked content for better retrieval
    embedding vector(768), -- For text-embedding models (768 dimensions)
    doc_type TEXT DEFAULT 'general', -- 'policy', 'faq', 'product', 'general'
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false, -- Public docs accessible by all users
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search (IVFFlat for faster search)
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON public.documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_public ON public.documents(is_public);

-- ==================================================
-- 4. USAGE LOGS TABLE
-- Track API usage for cost management
-- ==================================================

CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    query_type TEXT NOT NULL, -- 'chat', 'market_analysis', 'comparison', 'rag'
    model_used TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    latency_ms INTEGER DEFAULT 0, -- Response time in milliseconds
    cached BOOLEAN DEFAULT false, -- Was this served from cache?
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON public.usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_type ON public.usage_logs(query_type);

-- ==================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================

-- Enable RLS on all tables
ALTER TABLE public.response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Response Cache Policies (public read, admin write)
CREATE POLICY "Response cache is publicly readable"
ON public.response_cache FOR SELECT
USING (true);

CREATE POLICY "Only service role can modify cache"
ON public.response_cache FOR ALL
USING (auth.role() = 'service_role');

-- Documents Policies
CREATE POLICY "Users can view their own documents"
ON public.documents FOR SELECT
USING (
    auth.uid() = user_id 
    OR is_public = true
);

CREATE POLICY "Users can insert their own documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.documents FOR DELETE
USING (auth.uid() = user_id);

-- Usage Logs Policies
CREATE POLICY "Users can view their own usage"
ON public.usage_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs"
ON public.usage_logs FOR INSERT
WITH CHECK (true); -- Allow inserts from authenticated users

-- ==================================================
-- 6. HELPER FUNCTIONS
-- ==================================================

-- Function to search similar documents using vector similarity
CREATE OR REPLACE FUNCTION search_documents(
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.content,
        1 - (d.embedding <=> query_embedding) as similarity
    FROM public.documents d
    WHERE 
        (filter_user_id IS NULL OR d.user_id = filter_user_id OR d.is_public = true)
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to get or create cache entry
CREATE OR REPLACE FUNCTION get_cached_response(p_query_hash TEXT)
RETURNS TABLE (
    response_text TEXT,
    hit BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    cached_response TEXT;
BEGIN
    -- Try to get from cache
    SELECT rc.response_text INTO cached_response
    FROM public.response_cache rc
    WHERE rc.query_hash = p_query_hash
    AND rc.expires_at > NOW();
    
    IF cached_response IS NOT NULL THEN
        -- Update hit count
        UPDATE public.response_cache 
        SET hit_count = hit_count + 1, updated_at = NOW()
        WHERE query_hash = p_query_hash;
        
        RETURN QUERY SELECT cached_response, true;
    ELSE
        RETURN QUERY SELECT NULL::TEXT, false;
    END IF;
END;
$$;

-- ==================================================
-- 7. CHAT HISTORY TABLE UPDATE
-- Create table if it doesn't exist, or update it
-- ==================================================

CREATE TABLE IF NOT EXISTS public.chat_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Ensure user_id column exists if table already existed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_histories' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.chat_histories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.chat_histories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own chats" ON public.chat_histories;
DROP POLICY IF EXISTS "Users can insert their own chats" ON public.chat_histories;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.chat_histories;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.chat_histories;

-- Create Policies
CREATE POLICY "Users can view their own chats"
ON public.chat_histories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats"
ON public.chat_histories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
ON public.chat_histories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
ON public.chat_histories FOR DELETE
USING (auth.uid() = user_id);

-- Also create messages table if needed for history
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.chat_histories(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of their chats"
ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_histories
        WHERE id = messages.chat_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages to their chats"
ON public.messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chat_histories
        WHERE id = messages.chat_id AND user_id = auth.uid()
    )
);
