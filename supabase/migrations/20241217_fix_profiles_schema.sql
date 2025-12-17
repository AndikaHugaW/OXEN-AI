-- FIX PROFILES SCHEMA
-- Menambahkan kolom yang mungkin hilang jika tabel sudah terlanjur dibuat di masa lalu
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Memastikan RLS policy mengizinkan update (jaga-jaga)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
create policy "Public profiles are viewable by everyone." on public.profiles for select using ( true );
create policy "Users can insert their own profile." on public.profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on public.profiles for update using ( auth.uid() = id );

-- Refersh Schema Cache PostgREST
NOTIFY pgrst, 'reload config';
