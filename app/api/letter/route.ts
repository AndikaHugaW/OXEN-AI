import { NextRequest, NextResponse } from 'next/server';
import { generateLetter } from '@/lib/llm/rag-service';

export async function POST(request: NextRequest) {
  try {
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

    // Validate LLM provider configuration
    // The getLLMProvider() function will throw appropriate error if config is missing

    const letter = await generateLetter(
      letterType,
      recipient,
      subject,
      content,
      additionalContext
    );

    return NextResponse.json({
      success: true,
      letter: letter,
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

