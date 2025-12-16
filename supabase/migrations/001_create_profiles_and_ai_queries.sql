-- Migration: Create profiles and ai_queries tables with RLS policies
-- This migration creates the necessary tables for user profiles and AI query history

-- 1. Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create ai_queries table (stores user interactions with AI model)
CREATE TABLE IF NOT EXISTS public.ai_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  response TEXT,
  mode TEXT, -- 'chat', 'letter', 'market_analysis', etc.
  metadata JSONB, -- Store additional data like chart info, structured output, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_queries_user_id ON public.ai_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_queries_created_at ON public.ai_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 4. Enable Row-Level Security (RLS) on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_queries ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for profiles table
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 6. RLS Policies for ai_queries table
-- Users can view their own queries
CREATE POLICY "Users can view their own queries"
  ON public.ai_queries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own queries
CREATE POLICY "Users can insert their own queries"
  ON public.ai_queries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own queries (optional, if needed)
CREATE POLICY "Users can update their own queries"
  ON public.ai_queries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger to auto-update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

