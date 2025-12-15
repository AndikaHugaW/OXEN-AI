import { NextRequest, NextResponse } from 'next/server';
import { routeAIRequest, AIRequestContext, getGlobalPromptRules, RequestMode } from '@/lib/llm/ai-request-router';
import { getLLMProvider } from '@/lib/llm/providers';
import { needsVisualization, generateVisualization, needsImage, generateImageUrl, isMarketDataRequest } from '@/lib/llm/chart-generator';
import { parseStructuredOutput, StructuredResponse } from '@/lib/llm/structured-output';

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
    
    // For streaming responses (business admin mode only), use direct streaming
    // Market analysis and letter generation use the router without streaming for now
    if (useStreaming && llmProvider.generateStreamResponse) {
      const marketInfo = isMarketDataRequest(message);
      
      // Only stream for business admin mode (non-market, non-letter requests)
      // Use old streaming approach for backward compatibility
      if (!marketInfo.isMarket && !message.toLowerCase().includes('surat') && !message.toLowerCase().includes('letter')) {
        try {
          // For streaming, use direct LLM call with business prompt
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

          // Build business admin prompt for streaming
          const needsChart = needsVisualization(message);
          const globalRules = getGlobalPromptRules();

          const businessPrompt = `━━━━━━━━━━━━━━━━━━━━━━
MODE: MODE_BUSINESS_ADMIN
━━━━━━━━━━━━━━━━━━━━━━

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
- Bahasa Indonesia yang profesional namun mudah dipahami
- Bisa menggunakan gaya casual profesional (gen-z friendly)
- Tetap sopan dan menghormati
- Break down konsep kompleks menjadi sederhana
- Berikan solusi yang actionable dan praktis
- Jika menggunakan data/fakta, sebutkan sumbernya jika perlu

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

    // Use AI Request Router for non-streaming requests
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
    
    // Get market info for chart detection
    const marketInfo = isMarketDataRequest(message);

    // VALIDASI RESPONSE: Parse structured output dengan error handling
    let structuredOutput: StructuredResponse | null = routerResponse.structuredOutput || null;
    
    // Helper function to detect placeholder/invalid messages
    const isValidAnalysisMessage = (msg: string): boolean => {
      if (!msg || msg.length < 200) return false;
      
      // List of placeholder patterns to detect
      const placeholderPatterns = [
        /ANALISIS LENGKAP.*WAJIB DIISI/i,
        /DISINI.*WAJIB/i,
        /LENGKAP.*DISINI/i,
        /WAJIB DIISI/i,
        /ANALISIS.*DISINI/i,
        /isi.*disini/i,
        /fill.*here/i,
        /complete.*here/i,
        /analysis.*here/i,
      ];
      
      // Check if message contains placeholder text
      for (const pattern of placeholderPatterns) {
        if (pattern.test(msg)) {
          console.warn('⚠️ API Route: Detected placeholder text in message');
          return false;
        }
      }
      
      // Check if message contains actual analysis keywords
      const analysisKeywords = [
        'data yang digunakan',
        'fakta dari data',
        'analisis teknikal',
        'skenario',
        'risiko',
        'kesimpulan',
        'trend',
        'rsi',
        'ma20',
        'support',
        'resistance',
        'probabilitas',
        'kemungkinan',
      ];
      
      const msgLower = msg.toLowerCase();
      const keywordCount = analysisKeywords.filter(keyword => 
        msgLower.includes(keyword)
      ).length;
      
      // Must have at least 3 analysis keywords to be considered valid
      return keywordCount >= 3;
    };

    // For market analysis mode, ensure we have comprehensive analysis
    if (routerResponse.mode === RequestMode.MARKET_ANALYSIS) {
      // If structured output exists and has valid message, use it
      if (structuredOutput && structuredOutput.message && isValidAnalysisMessage(structuredOutput.message)) {
        responseText = structuredOutput.message;
        console.log('✅ API Route: Using valid structured output message');
      } else {
        // Message invalid or too short, use handler response (which should be comprehensive)
        console.warn('⚠️ API Route: Structured output message invalid, using handler response');
        // responseText already set from routerResponse.response which is validated
      }
      // If no structured output, try to parse from response
      if (!structuredOutput) {
        try {
          structuredOutput = parseStructuredOutput(responseText);
          // If parsed successfully and has valid message, use it
          if (structuredOutput && structuredOutput.message && isValidAnalysisMessage(structuredOutput.message)) {
            responseText = structuredOutput.message;
            console.log('✅ API Route: Using parsed structured output message');
          }
        } catch (error) {
          console.warn('Error parsing structured output, using handler response:', error);
        }
      }
    } else {
      // For non-market requests, parse structured output normally
      if (!structuredOutput) {
        try {
          structuredOutput = parseStructuredOutput(responseText);
        } catch (error) {
          console.error('Error parsing structured output:', error);
          structuredOutput = {
            action: 'text_only',
            message: responseText,
          };
        }
      }
    }
    
    // Check if visualization is needed (from structured output atau detection)
    const needsChart = needsVisualization(message);
    
    console.log('🔍 API Route - Chart Detection:', {
      message,
      needsChart,
      marketInfo,
      structuredOutput,
      responseText: responseText.substring(0, 100),
    });
    
    // Use chart from router response if available, otherwise generate
    let visualization: { chart?: any; table?: any } | null = routerResponse.chart ? { chart: routerResponse.chart } : null;
    let finalResponse = responseText;
    
    // PRIORITAS 1: If router provided chart (from market analysis handler), use it
    if (!visualization) {
      // PRIORITAS 2: Jika structured output menunjukkan show_chart, generate visualization
      // VALIDASI: Hanya render chart jika action benar-benar show_chart
      if (structuredOutput && structuredOutput.action === 'show_chart') {
        const symbol = structuredOutput.symbol || marketInfo.symbol;
        const type = structuredOutput.asset_type || marketInfo.type || 'crypto';
        
        console.log('✅ API: Generating chart from structured output:', { symbol, type });
        
        if (symbol) {
          visualization = await generateVisualization(`analisis ${symbol} ${structuredOutput.timeframe || '7 hari'}`);
          console.log('✅ API: Chart generated:', !!visualization?.chart);
        }
        // Use message dari structured output jika ada
        if (structuredOutput.message) {
          finalResponse = structuredOutput.message;
        }
      } 
      // PRIORITAS 3: Fallback agresif - jika market request terdeteksi tapi tidak ada structured output
      else if (marketInfo.isMarket && marketInfo.symbol) {
        console.log('⚠️ API: Market request detected but no structured output - using fallback');
        visualization = await generateVisualization(message);
        console.log('✅ API: Chart generated from fallback:', !!visualization?.chart);
      }
      // PRIORITAS 4: Detection biasa
      else if (needsChart) {
        console.log('📊 API: Generating chart from detection');
        visualization = await generateVisualization(message);
      }
    } else {
      console.log('✅ API: Using chart from router response');
    }
    
    // Check if image is needed (for future implementation)
    let imageUrl: string | null = null;
    if (needsImage(message)) {
      imageUrl = await generateImageUrl(message);
    }

    // Build response based on mode
    const response: any = {
      success: true,
      response: finalResponse,
      chart: visualization?.chart || routerResponse.chart,
      table: visualization?.table || routerResponse.table,
      imageUrl: imageUrl || undefined,
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

