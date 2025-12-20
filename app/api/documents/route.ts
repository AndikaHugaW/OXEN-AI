import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { listDocuments } from '@/lib/rag/rag-service';

/**
 * GET - List user's documents for Knowledge Base
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const docType = searchParams.get('type') || undefined;

    const documents = await listDocuments(user.id, { docType });

    return NextResponse.json({
      success: true,
      documents: documents || []
    });
  } catch (error: any) {
    console.error('❌ [Documents API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to list documents'
    }, { status: 500 });
  }
}
