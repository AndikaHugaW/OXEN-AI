import { NextRequest, NextResponse } from 'next/server';
import { routeAIRequest, AIRequestContext, RequestMode } from '@/lib/llm/ai-request-router';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // 🔒 VERIFIKASI SESI PENGGUNA (LANGKAH KRITIS)
    const cookieStore = await cookies();
    const supabase = createServerSupabaseClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // Pengguna belum login
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          message: 'Please login to access the letter generator.'
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      letterType, 
      recipient, 
      subject, 
      content, 
      additionalContext 
    } = body;

    // Validate required fields
    if (!letterType || !recipient || !subject || !content) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['letterType', 'recipient', 'subject', 'content']
        },
        { status: 400 }
      );
    }

    // Use AI Request Router with LETTER_GENERATOR mode
    const context: AIRequestContext = {
      message: `Generate letter: ${letterType} to ${recipient}`,
      mode: RequestMode.LETTER_GENERATOR,
      letterType,
      recipient,
      subject,
      content,
      additionalContext,
    };

    const routerResponse = await routeAIRequest(context);

    if (!routerResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: routerResponse.error || 'Failed to generate letter'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      letter: routerResponse.letter,
    });
  } catch (error: any) {
    console.error('Letter API error:', error);
    
    // Provide more detailed error messages
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    // Check for configuration errors
    if (errorMessage.includes('tidak dikonfigurasi') || errorMessage.includes('not configured')) {
      statusCode = 400;
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate letter',
        message: errorMessage
      },
      { status: statusCode }
    );
  }
}

