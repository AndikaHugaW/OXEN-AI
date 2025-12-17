-- ==================================================
-- MONITORING & EVALUATION (M&E) UPGRADE
-- ==================================================

-- 1. FEEDBACK LOOP
-- Tambah kolom rating & feedback ke tabel messages (jika belum ada)
-- Kita asumsikan tabel messages menyimpan detail chat per bubble
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'rating') THEN
        ALTER TABLE public.messages ADD COLUMN rating INTEGER CHECK (rating IN (-1, 0, 1)); -- -1: Dislike, 1: Like
        ALTER TABLE public.messages ADD COLUMN feedback_text TEXT;
    END IF;
END $$;

-- 2. KNOWLEDGE BASE ANALYTICS
-- Tabel untuk melacak dokumen mana yang "berjasa" menjawab pertanyaan
CREATE TABLE IF NOT EXISTS public.document_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    query_id UUID, -- Bisa refer ke usage_logs.id atau chat_history.id
    user_id UUID REFERENCES auth.users(id),
    used_at TIMESTAMPTZ DEFAULT NOW(),
    relevance_score FLOAT -- Seberapa relevan dokumen ini menurut vector search
);

-- Enable RLS for document_usage
ALTER TABLE public.document_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own document usage"
ON public.document_usage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert document usage"
ON public.document_usage FOR INSERT
WITH CHECK (true); -- Usually inserted by backend

-- 3. AI HEALTH DASHBOARD (SUMMARY TABLE)
-- Tabel agregat harian agar Dashboard Analytics cepat (ringan)
CREATE TABLE IF NOT EXISTS public.daily_ai_health (
    date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    total_queries INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    avg_latency_ms FLOAT DEFAULT 0,
    avg_rating FLOAT DEFAULT 0, -- Rata-rata kepuasan user
    error_count INTEGER DEFAULT 0,
    cache_hit_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daily_ai_health ENABLE ROW LEVEL SECURITY;

-- Allow users to view health stats (or restrict to admin only in future)
CREATE POLICY "Users can view AI health stats"
ON public.daily_ai_health FOR SELECT
USING (true);

-- 4. FUNCTION: Update Daily Summary
-- Fungsi ini akan dipanggil setiap kali ada request baru (atau via cron)
-- Tapi untuk efisiensi, kita buat sederhana: fungsi untuk upsert harian
CREATE OR REPLACE FUNCTION update_daily_health_stat(
    p_tokens INT,
    p_latency INT,
    p_is_error BOOLEAN,
    p_is_cache_hit BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.daily_ai_health (
        date, 
        total_queries, 
        total_tokens, 
        avg_latency_ms, 
        error_count, 
        cache_hit_count
    )
    VALUES (
        CURRENT_DATE,
        1,
        p_tokens,
        p_latency,
        CASE WHEN p_is_error THEN 1 ELSE 0 END,
        CASE WHEN p_is_cache_hit THEN 1 ELSE 0 END
    )
    ON CONFLICT (date) DO UPDATE SET
        total_queries = daily_ai_health.total_queries + 1,
        total_tokens = daily_ai_health.total_tokens + EXCLUDED.total_tokens,
        -- Update Moving Average for Latency: NewAvg = OldAvg + (NewVal - OldAvg) / NewTotal
        avg_latency_ms = daily_ai_health.avg_latency_ms + (EXCLUDED.avg_latency_ms - daily_ai_health.avg_latency_ms) / (daily_ai_health.total_queries + 1),
        error_count = daily_ai_health.error_count + EXCLUDED.error_count,
        cache_hit_count = daily_ai_health.cache_hit_count + EXCLUDED.cache_hit_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
