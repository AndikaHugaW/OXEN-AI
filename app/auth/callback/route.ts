import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to home page or the specified next URL
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

