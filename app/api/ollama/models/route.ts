import { NextRequest, NextResponse } from 'next/server';

// Get list of available models
export async function GET(request: NextRequest) {
  try {
    let baseURL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    if (baseURL.includes('localhost')) {
      baseURL = baseURL.replace('localhost', '127.0.0.1');
    }
    
    let response: Response;
    try {
      response = await fetch(`${baseURL}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Ollama API error: ${errorText}`);
    }

    const data = await response.json().catch((parseError) => {
      console.error('JSON parse error in models GET:', parseError);
      throw new Error('Invalid JSON response from Ollama');
    });
    
    return NextResponse.json({
      success: true,
      models: data.models || [],
    });
  } catch (error: any) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch models',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Download/pull a model
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

    // Start pulling the model
    let response: Response;
    try {
      response = await fetch(`${baseURL}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: model,
          stream: false, // We'll handle streaming separately if needed
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
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to pull model: ${errorText}`);
    }

    // Ollama pull with stream=false returns JSON, but might be empty or malformed
    const responseText = await response.text();
    let data;
    
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.error('JSON parse error in models POST:', parseError);
      console.error('Response text:', responseText.substring(0, 200));
      // If it's not JSON but response was OK, assume success
      data = { status: 'success' };
    }

    return NextResponse.json({
      success: true,
      message: `Model ${model} downloaded successfully`,
      data,
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

