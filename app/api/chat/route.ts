import { NextRequest, NextResponse } from 'next/server';
import { getChatResponse } from '@/lib/llm/rag-service';
import { getLLMProvider } from '@/lib/llm/providers';

export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request body',
          message: 'Request body must be valid JSON'
        },
        { status: 400 }
      );
    }

    const { message, conversationHistory = [], stream = true } = body;

    if (!message) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Message is required' 
        },
        { status: 400 }
      );
    }

    // Check if streaming is requested and supported
    const useStreaming = stream !== false; // Default to true for speed
    const llmProvider = getLLMProvider();
    
    // If streaming is requested and provider supports it, use streaming
    if (useStreaming && llmProvider.generateStreamResponse) {
      try {
        let context = "";

        // Check if query needs RAG (optimized for business context)
        const needsRAG = message.length > 10 && 
          ['surat', 'letter', 'format', 'prosedur', 'procedure', 'dokumen', 'document', 
           'cara', 'how to', 'bagaimana', 'strategi', 'strategy', 'bisnis', 'business',
           'perusahaan', 'company', 'marketing', 'hr', 'recruitment', 'finance', 'keuangan',
           'sales', 'customer', 'client', 'proposal', 'laporan', 'report', 'analisis', 'analysis',
           'planning', 'perencanaan', 'budget', 'anggaran', 'branding', 'brand']
            .some(keyword => message.toLowerCase().includes(keyword));

        if (needsRAG) {
          try {
            const { initializeVectorStore } = await import('@/lib/llm/rag-service');
            const store = await initializeVectorStore();
            const relevantDocs = await store.similaritySearch(message, 2);
            if (relevantDocs.length > 0) {
              context = relevantDocs.map((doc: any) => doc.pageContent).join("\n\n");
            }
          } catch (ragError) {
            console.warn("RAG retrieval failed, continuing without context:", ragError);
          }
        }

        const systemPrompt = `Kamu adalah AI assistant yang fokus banget ke bisnis dan perusahaan. Tugas kamu bantu solve masalah bisnis, bikin dokumen perusahaan, analisis data, strategi marketing, HR stuff, dan hal-hal corporate lainnya.

${context ? `Konteks yang bisa kamu pakai:\n${context}\n\n` : ""}STYLE KOMUNIKASI:
- Pakai bahasa Indonesia yang casual tapi tetap profesional (gen-z vibes)
- Bisa pakai kata-kata kayak: "gas", "mantap", "keren", "beneran", "gimana", "kayaknya", "banget", "fr" (for real), "lowkey/highkey", "bet", "facts", "ngl" (not gonna lie), "tbh" (to be honest), "imo" (in my opinion)
- Tetap sopan dan respect, tapi ga kaku banget
- Kalau perlu explain sesuatu yang kompleks, break down jadi simple dan easy to understand
- Kasih solusi yang actionable dan praktis untuk bisnis
- Kalau ada data atau fakta, mention sumbernya kalau perlu

FOKUS AREA:
- Business strategy & planning
- Marketing & branding
- HR & recruitment
- Finance & accounting
- Operations & logistics
- Customer service
- Sales & business development
- Corporate communication
- Document management
- Data analysis & reporting

Jawab dengan style yang engaging tapi tetap professional ya!`;

        const filteredHistory = conversationHistory.filter((msg: any) => msg.role !== "system");
        const messages = [
          { role: "system", content: systemPrompt },
          ...filteredHistory,
          { role: "user", content: message },
        ];

        // Create streaming response
        const stream = await llmProvider.generateStreamResponse(messages, { temperature: 0.7 });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (streamError: any) {
        console.warn('Streaming failed, falling back to non-streaming:', streamError);
        // Fall through to non-streaming response
      }
    }

    // Non-streaming response (fallback or when streaming disabled)
    const response = await getChatResponse(message, conversationHistory, { stream: false });

    // Ensure response is a string
    const responseText = typeof response === 'string' ? response : String(response || 'Tidak ada respons');

    return NextResponse.json({
      success: true,
      response: responseText,
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error messages
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    // Check for configuration errors
    if (errorMessage.includes('tidak dikonfigurasi') || errorMessage.includes('not configured')) {
      statusCode = 400;
      errorMessage = error.message;
    }
    
    // Ensure error message is a string and doesn't contain invalid characters
    const safeErrorMessage = String(errorMessage).substring(0, 500);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate response',
        message: safeErrorMessage
      },
      { status: statusCode }
    );
  }
}

