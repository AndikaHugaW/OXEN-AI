import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Provide fallback values if env variables are not set
  // This prevents runtime errors during development
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables are not set. Authentication features will be disabled.');
    // Return a mock client that will fail gracefully
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

