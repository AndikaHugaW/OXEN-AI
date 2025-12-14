import { NextRequest, NextResponse } from 'next/server';

// Get list of available models
export async function GET(request: NextRequest) {
  try {
    const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    const response = await fetch(`${baseURL}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

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

    const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    // Start pulling the model
    const response = await fetch(`${baseURL}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: model,
        stream: false, // We'll handle streaming separately if needed
      }),
    });

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

