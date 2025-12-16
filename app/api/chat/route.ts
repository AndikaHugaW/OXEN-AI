import { NextRequest, NextResponse } from 'next/server';
import { routeAIRequest, AIRequestContext, getGlobalPromptRules, RequestMode } from '@/lib/llm/ai-request-router';
import { getLLMProvider } from '@/lib/llm/providers';
import { needsVisualization, generateVisualization, needsImage, generateImageUrl, isMarketDataRequest, extractMultipleSymbols } from '@/lib/llm/chart-generator';
import { StructuredResponse } from '@/lib/llm/structured-output';

// ✅ OPTIMIZED: Separate concerns - chat endpoint only handles LLM + streaming
export const maxDuration = 60;
export const runtime = 'nodejs';

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
    
    // Check if this is a comparison request
    const isComparisonRequest = /(?:bandingkan|perbandingan|compare|comparison|vs|versus)/i.test(message);
    const marketInfo = isMarketDataRequest(message);
    const isMarketRequest = marketInfo.isMarket && marketInfo.symbol;
    
    // ✅ OPTIMIZATION NOTE: 
    // For comparison requests, data fetching is handled inside processMarketComparison
    // which uses parallel fetching and cache. The router will handle it efficiently.
    // We don't need to pre-fetch here to avoid double fetching.
    
    // ✅ STREAMING FIRST: Always try streaming for LLM responses (even for comparison)
    // Chart will be added to response after streaming completes
    if (useStreaming && llmProvider.generateStreamResponse) {
      // For business admin mode (non-market, non-letter)
      if (!isMarketRequest && !message.toLowerCase().includes('surat') && !message.toLowerCase().includes('letter')) {
        try {
          // Get context from RAG
          let context = "";
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

          // Detect language from user message
          const isIndonesian = /[aku|saya|kamu|gimana|bagaimana|tolong|bisa|mau|ingin|punya|dengan|untuk|biar|jelasin|jelaskan|dasar|teori|budget|juta|marketing|alokasi|efektif]/i.test(message);
          const isEnglish = /^[a-zA-Z\s.,!?'"-]+$/.test(message.trim().substring(0, 100));
          const detectedLanguage = isIndonesian ? 'Bahasa Indonesia' : (isEnglish ? 'English' : 'Bahasa Indonesia (default)');
          
          // Build business admin prompt for streaming
          const needsChart = needsVisualization(message);
          const globalRules = getGlobalPromptRules();

          const businessPrompt = `━━━━━━━━━━━━━━━━━━━━━━
MODE: MODE_BUSINESS_ADMIN
━━━━━━━━━━━━━━━━━━━━━━

🚨🚨🚨 PENTING SEKALI - BAHASA RESPONS (WAJIB DIPATUHI): 🚨🚨🚨
- User bertanya dalam: ${detectedLanguage}
- KAMU HARUS menjawab dalam ${detectedLanguage} yang SAMA
- JANGAN gunakan bahasa lain selain ${detectedLanguage}
- Jika user bertanya dalam Bahasa Indonesia → jawab 100% dalam Bahasa Indonesia
- Jika user bertanya dalam English → jawab 100% dalam English
- Ini adalah ATURAN WAJIB yang TIDAK BOLEH dilanggar
- Contoh: User bertanya "Gimana cara..." → jawab "Cara yang bisa kamu lakukan adalah..." (BUKAN "The way you can do is...")
- Contoh: User bertanya "How to..." → jawab "The way you can do is..." (BUKAN "Cara yang bisa kamu lakukan adalah...")

ATURAN WAJIB:
1. Fokus pada SOP, workflow, efisiensi, dan dokumentasi bisnis.
2. TIDAK memberi nasihat hukum/pajak resmi (hanya informasi umum).
3. Jangan mengarang data, fakta, atau regulasi.
4. Gunakan asumsi HANYA jika disebutkan secara eksplisit.
5. Jika data tidak cukup → minta data tambahan atau jelaskan keterbatasan.
6. Pisahkan fakta, analisis, dan asumsi dengan jelas.
7. Output bersifat informatif dan rekomendasi, bukan keputusan final.

⚠️ PENTING - DATA HARUS DARI API:
- JANGAN PERNAH menggunakan sample data, dummy data, atau data yang dibuat-buat
- SEMUA data chart/tabel HARUS diambil dari API yang sebenarnya
- Jika data tidak tersedia dari API, beri tahu user bahwa data tidak bisa diambil
- JANGAN gunakan sample data sebagai fallback

${context ? `KONTEKS YANG TERSEDIA:\n${context}\n\n` : ""}FOKUS AREA:
- Business strategy & planning
- Marketing & branding
- HR & recruitment
- Finance & accounting (informasi umum, bukan nasihat resmi)
- Operations & logistics
- Customer service
- Sales & business development
- Corporate communication
- Document management
- Data analysis & reporting
- SOP & workflow optimization
- Process efficiency

STYLE KOMUNIKASI:
- Untuk Bahasa Indonesia: Bahasa Indonesia yang profesional namun mudah dipahami, bisa menggunakan gaya casual profesional (gen-z friendly)
- Untuk English: Professional but approachable language, gen-z friendly style
- Tetap sopan dan menghormati
- Break down konsep kompleks menjadi sederhana
- Berikan solusi yang actionable dan praktis
- Jika menggunakan data/fakta, sebutkan sumbernya jika perlu

⚠️⚠️⚠️ PENTING - JANGAN ULANG ATURAN PROMPT:
- JANGAN menulis kembali atau mengutip aturan-aturan di atas dalam respons kamu
- JANGAN menampilkan instruksi seperti "🚨🚨🚨 PENTING SEKALI - BAHASA RESPONS" atau aturan lainnya
- JANGAN menjelaskan bahwa kamu mengikuti aturan tertentu
- Langsung jawab pertanyaan user dengan natural, seolah-olah aturan tersebut sudah otomatis diterapkan
- User tidak perlu tahu tentang aturan internal yang kamu gunakan

${needsChart ? `\nCATATAN: User meminta visualisasi. Sistem akan otomatis menampilkan visualisasi yang relevan.` : ''}

FORMAT WAJIB OUTPUT:
1. RINGKASAN - Poin utama dari pertanyaan/permintaan user
2. ANALISIS MASALAH - Identifikasi masalah atau kebutuhan
3. OPSI SOLUSI - Beberapa opsi dengan kelebihan/kekurangan
4. REKOMENDASI - Rekomendasi utama dengan alasan
5. LANGKAH IMPLEMENTASI - Langkah konkret yang bisa dilakukan`;

          const systemPrompt = `${globalRules}\n\n${businessPrompt}`;

          const filteredHistory = conversationHistory.filter((msg: any) => msg.role !== "system");
          const messages = [
            { role: "system", content: systemPrompt },
            ...filteredHistory,
            { role: "user", content: message },
          ];

          const streamResponse = await llmProvider.generateStreamResponse(messages, { 
            temperature: 0.7,
          });

          return new Response(streamResponse, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        } catch (streamError: any) {
          console.warn('Streaming failed, falling back to router:', streamError);
          // Fall through to non-streaming router
        }
      }
    }

    // ✅ NON-STREAMING: For market analysis, letter generation, and comparison
    // These need structured output (charts, tables) which requires full response
    const context: AIRequestContext = {
      message,
      conversationHistory,
      stream: false,
    };

    const routerResponse = await routeAIRequest(context);

    if (!routerResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: routerResponse.error || 'Failed to process request',
        },
        { status: 500 }
      );
    }

    // Extract response text based on mode
    let responseText = routerResponse.response || routerResponse.letter || 'Tidak ada respons';
    responseText = typeof responseText === 'string' ? responseText : String(responseText || 'Tidak ada respons');
    
    // marketInfo already defined above, reuse it

    // VALIDASI RESPONSE: Parse structured output dengan error handling
    let structuredOutput: StructuredResponse | null = routerResponse.structuredOutput || null;
    
    // Helper function to detect placeholder/invalid messages
    const isValidAnalysisMessage = (msg: string): boolean => {
      if (!msg || msg.trim().length === 0) return false;
      const lower = msg.toLowerCase();
      // Reject obvious placeholder messages
      const invalidPatterns = [
        'tidak ada respons',
        'no response',
        'placeholder',
        'sample data',
        'dummy data',
      ];
      return !invalidPatterns.some(pattern => lower.includes(pattern));
    };

    // Validate response text
    if (!isValidAnalysisMessage(responseText)) {
      console.warn('⚠️ Invalid or placeholder response detected, using fallback');
      responseText = 'Maaf, saya tidak dapat memberikan analisis yang valid untuk permintaan ini. Silakan coba lagi dengan pertanyaan yang lebih spesifik.';
    }

    // Extract chart and table from router response
    let finalChart = routerResponse.chart || null;
    let finalTable = routerResponse.table || null;
    let finalResponse = responseText;

    // If structured output exists, try to extract chart/table from it
    if (structuredOutput) {
      if (structuredOutput.chart) {
        finalChart = structuredOutput.chart;
      }
      if (structuredOutput.table) {
        finalTable = structuredOutput.table;
      }
      if (structuredOutput.message && isValidAnalysisMessage(structuredOutput.message)) {
        finalResponse = structuredOutput.message;
      }
    }

    // If no chart but market request detected, try to generate one
    if (!finalChart && isMarketRequest && marketInfo.symbol) {
      try {
        const visualization = await generateVisualization(message, marketInfo);
        if (visualization?.chart) {
          finalChart = visualization.chart;
        }
        if (visualization?.table) {
          finalTable = visualization.table;
        }
      } catch (vizError) {
        console.warn('Visualization generation failed:', vizError);
      }
    }

    // Build final response
    const response: any = {
      success: true,
      response: finalResponse,
      chart: finalChart,
      table: finalTable,
      imageUrl: routerResponse.imageUrl || undefined,
      structuredOutput: structuredOutput || undefined,
    };

    // Add mode-specific fields
    if (routerResponse.mode === RequestMode.MARKET_ANALYSIS) {
      if (routerResponse.marketData) response.marketData = routerResponse.marketData;
      if (routerResponse.indicators) response.indicators = routerResponse.indicators;
    }

    if (routerResponse.mode === RequestMode.LETTER_GENERATOR) {
      if (routerResponse.letter) response.letter = routerResponse.letter;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Chat API error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error messages
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    // Check for specific error types
    if (errorMessage.includes('tidak dikonfigurasi') || errorMessage.includes('not configured')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (errorMessage.includes('Network error') || errorMessage.includes('network error') || 
               errorMessage.includes('Failed to fetch') || errorMessage.includes('ECONNREFUSED')) {
      statusCode = 503; // Service Unavailable
      errorMessage = 'Network error: Tidak dapat terhubung ke server. Pastikan koneksi internet aktif dan server berjalan dengan baik.';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      statusCode = 504; // Gateway Timeout
      errorMessage = 'Request timeout: Server membutuhkan waktu terlalu lama untuk merespons. Silakan coba lagi.';
    } else if (errorMessage.includes('API error') || errorMessage.includes('API provider')) {
      statusCode = 502; // Bad Gateway
      errorMessage = `API provider error: ${error.message}`;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}

// Helper function to extract symbols from comparison message
function extractSymbolsFromMessage(message: string): Array<{ symbol: string; type: 'crypto' | 'stock' }> {
  return extractMultipleSymbols(message);
}
