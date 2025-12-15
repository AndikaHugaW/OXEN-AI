import { NextRequest, NextResponse } from 'next/server';

// Stream model download progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model } = body;

    if (!model) {
      return NextResponse.json(
        { success: false, error: 'Model name is required' },
        { status: 400 }
      );
    }

    let baseURL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    if (baseURL.includes('localhost')) {
      baseURL = baseURL.replace('localhost', '127.0.0.1');
    }

    // Start pulling the model with streaming
    let response: Response;
    try {
      response = await fetch(`${baseURL}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: model,
          stream: true,
        }),
      });
    } catch (fetchError: any) {
      const errorMsg = (fetchError.message || '').toLowerCase();
      const isConnectionError = 
        errorMsg.includes('econnrefused') ||
        errorMsg.includes('fetch failed') ||
        errorMsg.includes('networkerror') ||
        errorMsg.includes('failed to fetch') ||
        errorMsg.includes('err_connection_refused') ||
        errorMsg.includes('connection refused') ||
        errorMsg.includes('connect econnrefused') ||
        errorMsg.includes('getaddrinfo enotfound') ||
        errorMsg.includes('network request failed');
      
      if (isConnectionError) {
        throw new Error(`Tidak dapat terhubung ke Ollama di ${baseURL}.\n\nPastikan:\n1. Ollama sudah berjalan: ollama serve\n2. Port 11434 tidak digunakan aplikasi lain\n3. Test manual: curl ${baseURL}/api/tags`);
      }
      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to pull model: ${errorText}`);
    }

    // Create a readable stream to forward the response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            // Forward each chunk
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error pulling model:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to download model',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

