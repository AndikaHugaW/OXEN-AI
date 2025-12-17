-- ==================================================
-- ROLE-BASED ACCESS CONTROL (RBAC) & ADVANCED ANALYTICS
-- ==================================================

-- 1. PROFILES TABLE SETUP
-- Pastikan tabel profiles ada untuk menyimpan role user
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ADD ROLE COLUMN
-- Tambahkan kolom role jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    END IF;
END $$;

-- 3. AUTO-CREATE PROFILE TRIGGER
-- Memastikan setiap user baru punya profile entry
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    -- Hack: Email pertama/tertentu otomatis jadi admin (opsional)
    CASE WHEN count_users = 0 THEN 'admin' ELSE 'user' END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. SECURE ANALYTICS TABLES (RLS)
-- Update daily_ai_health agar HANYA ADMIN yang bisa baca
ALTER TABLE public.daily_ai_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view AI health stats" ON public.daily_ai_health;
DROP POLICY IF EXISTS "Admins can view AI health stats" ON public.daily_ai_health;

CREATE POLICY "Admins can view AI health stats"
ON public.daily_ai_health FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Update usage_logs agar user biasa cuma bisa liat punya sendiri, admin bisa liat semua
DROP POLICY IF EXISTS "Users can view own logs" ON public.usage_logs;
CREATE POLICY "Users view own, Admins view all"
ON public.usage_logs FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 5. HELPER: Function untuk cek is_admin (biar gampang di UI)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. MANUAL UPDATE (IMPORTANT)
-- Script ini tidak tahu email Anda, jadi jalankan query ini manual di SQL Editor nanti
-- untuk menjadikan diri Anda admin:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL@gmail.com';
