import { NextRequest, NextResponse } from 'next/server';
import { routeAIRequest, AIRequestContext, getGlobalPromptRules, RequestMode, detectLanguage, detectRequestMode } from '@/lib/llm/ai-request-router';
import { getLLMProvider } from '@/lib/llm/providers';
import { needsVisualization, generateVisualization, needsImage, generateImageUrl, isMarketDataRequest, extractMultipleSymbols } from '@/lib/llm/chart-generator';
import { StructuredResponse } from '@/lib/llm/structured-output';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Import optimization services
import { getCachedResponse, setCachedResponse, shouldCacheQuery } from '@/lib/cache/response-cache';
import { buildRAGContext } from '@/lib/rag/rag-service';
import { createUsageTracker, estimateTokens } from '@/lib/usage/usage-tracker';
import { buildSearchContext } from '@/lib/tools/web-search';
import { generateBusinessImage } from '@/lib/tools/image-gen';

// ✅ OPTIMIZED: Separate concerns - chat endpoint only handles LLM + streaming
export const maxDuration = 300;
export const runtime = 'nodejs';

// Helper function to save query to database (non-blocking)
async function saveQueryToDatabase(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  message: string,
  response: string,
  mode: string = 'chat',
  metadata: Record<string, any> = {}
) {
  try {
    await supabase.from('ai_queries').insert({
      user_id: userId,
      prompt: message,
      response: response.substring(0, 10000), // Limit response length
      mode: mode,
      metadata: {
        ...metadata,
        saved_at: new Date().toISOString(),
      }
    });
  } catch (error) {
    // Log error tapi jangan gagalkan response
    console.warn('Failed to save query to database:', error);
  }
}

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
          message: 'Please login to access the AI model.'
        },
        { status: 401 }
      );
    }

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

    const { message, conversationHistory = [], stream = true, mode, webSearch = false, imageGen = false, fileIds = [] } = body;

    if (!message) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Message is required' 
        },
        { status: 400 }
      );
    }

    // ✅ CACHING: Create usage tracker for timing
    const usageTracker = createUsageTracker();

    // ✅ CACHING: Check for cached response if query is cacheable
    if (shouldCacheQuery(message)) {
      try {
        const cachedResponse = await getCachedResponse(message);
        if (cachedResponse && cachedResponse.hit) {
          console.log('🎯 [Cache] Returning cached response');
          
          // Log cached usage
          usageTracker.log(user.id, {
            queryType: 'chat',
            modelUsed: 'cached',
            inputTokens: estimateTokens(message),
            outputTokens: estimateTokens(cachedResponse.response_text),
            cached: true
          });
          
          return NextResponse.json({
            success: true,
            response: cachedResponse.response_text,
            cached: true
          });
        }
      } catch (cacheError) {
        console.warn('Cache check failed, continuing without cache:', cacheError);
      }
    }

    // Check if streaming is requested and supported
    const useStreaming = stream !== false; // Default to true for speed
    const llmProvider = getLLMProvider();
    
    // Check if this is a comparison request
    const isComparisonRequest = /(?:bandingkan|perbandingan|compare|comparison|vs|versus)/i.test(message);
    const marketInfo = isMarketDataRequest(message);
    const isMarketRequest = !!(marketInfo.isMarket && marketInfo.symbol);
    
    // ✅ OPTIMIZATION NOTE: 
    // For comparison requests, data fetching is handled inside processMarketComparison
    // which uses parallel fetching and cache. The router will handle it efficiently.
    // We don't need to pre-fetch here to avoid double fetching.
    
    // Detect if visualization is needed (charts/tables)
    const needsChart = needsVisualization(message);

    // Determine if we should stream
    // Stream if:
    // 1. Streaming is enabled AND provider supports it
    // 2. It is NOT a market request (market requests need structured data for charts immediately)
    // 3. It is NOT a letter request (letter requests need structured JSON)
    // 4. It does NOT need a chart (visualizations need structured output)
    // 5. Mode is explicitly BUSINESS_ADMIN or not set (default)
    const isLetterRequest = message.toLowerCase().includes('surat') || message.toLowerCase().includes('letter');
    
    // ✅ SMART ROUTING: If on Home page ('chat'), detect the "real" mode based on intent
    const detectedMode = mode === 'chat' ? detectRequestMode({ message, conversationHistory, fileIds: fileIds.length > 0 ? fileIds : undefined } as any) : mode;
    console.log(`🧠 [Chat API] Mode: ${mode} -> Resolved to: ${detectedMode}`);

    // Check mode-specific streaming rules
    // - MARKET_ANALYSIS: No streaming (needs structured data)
    // - LETTER_GENERATOR: No streaming (needs structured data)
    // - BUSINESS_ADMIN: Stream unless chart is needed
    // - COMPARISON: No streaming (needs structured chart data)
    const isExemptFromStreaming = 
      (detectedMode === RequestMode.MARKET_ANALYSIS) || 
      (detectedMode === RequestMode.LETTER_GENERATOR) ||
      needsChart || 
      isMarketRequest || 
      isLetterRequest ||
      isComparisonRequest; // ← Comparison needs structured chart data

    // Check if user is asking for image generation
    const lowerMessage = message.toLowerCase();
    const wantsImage = imageGen && (
      // Common patterns
      lowerMessage.includes('buat gambar') || 
      lowerMessage.includes('buatkan gambar') || 
      lowerMessage.includes('buatkan saya gambar') ||
      lowerMessage.includes('generate image') ||
      lowerMessage.includes('create image') ||
      // Illustration (with typo: illustrasi vs ilustrasi)
      lowerMessage.includes('ilustrasi') ||
      lowerMessage.includes('illustrasi') ||
      lowerMessage.includes('buatkan ilustrasi') ||
      lowerMessage.includes('buatkan illustrasi') ||
      lowerMessage.includes('buatkan saya ilustrasi') ||
      lowerMessage.includes('buatkan saya illustrasi') ||
      // Visual patterns
      lowerMessage.includes('gambar untuk') ||
      lowerMessage.includes('gambarkan') ||
      // Simple triggers when image mode is on
      lowerMessage.includes('gambar') ||
      lowerMessage.includes('foto') ||
      lowerMessage.includes('desain') ||
      lowerMessage.includes('logo') ||
      lowerMessage.includes('poster')
    );
    console.log(`🎨 [Chat API] Image Gen enabled: ${imageGen}, User wants image: ${wantsImage}`);

    const shouldStream = useStreaming && llmProvider.generateStreamResponse && !isExemptFromStreaming && !wantsImage;

    // ✅ STREAMING FIRST: Always try streaming for LLM responses (even for comparison)
    // Chart will be added to response after streaming completes
    if (shouldStream) {
      // For business admin mode (non-market, non-letter)
       try {
          // Get context from RAG
          // Get context from RAG and Web Search
          let ragContextText = "";
          
          // 🔍 DEBUG: Log fileIds being passed
          console.log(`🔍 [RAG-Debug] fileIds received:`, fileIds);
          console.log(`🔍 [RAG-Debug] fileIds.length:`, fileIds.length);
          
          try {
            const ragResult = await buildRAGContext(message, user.id, fileIds.length > 0 ? fileIds : undefined);
            
            // 🔍 DEBUG: Log RAG result
            console.log(`🔍 [RAG-Debug] RAG result:`, {
              hasRelevantDocs: ragResult.hasRelevantDocs,
              docCount: ragResult.documents.length,
              contextLength: ragResult.contextText.length,
              contextPreview: ragResult.contextText.substring(0, 300)
            });
            
            if (ragResult.hasRelevantDocs) {
              ragContextText = ragResult.contextText;
              console.log(`📚 [RAG-Stream] Found ${ragResult.documents.length} relevant documents`);
              console.log(`📚 [RAG-Stream] Context length: ${ragContextText.length} chars`);
            } else {
              console.warn(`⚠️ [RAG-Stream] No relevant documents found!`);
            }
          } catch (ragError) {
            console.error("❌ RAG retrieval failed:", ragError);
          }

          let searchContextText = '';
          if (webSearch) {
            try {
              console.log(`🌐 [WebSearch-Stream] Searching for: ${message}`);
              searchContextText = await buildSearchContext(message);
            } catch (searchError) {
              console.warn('Web search failed:', searchError);
            }
          }
          
          const ragContext = `${ragContextText}\n\n${searchContextText}`.trim();
          
          // 🔍 DEBUG: Log final RAG context
          console.log(`🔍 [RAG-Debug] Final ragContext length: ${ragContext.length} chars`);
          if (ragContext.length > 0) {
            console.log(`🔍 [RAG-Debug] Final ragContext preview: ${ragContext.substring(0, 400)}...`);
          } else {
            console.warn(`⚠️ [RAG-Debug] ragContext is EMPTY! AI will hallucinate!`);
          }
          
          // Detect language using utility
          const language = detectLanguage(message);
          const detectedLanguageLabel = language === 'id' ? 'Bahasa Indonesia' : 'English';
          
          // ✅ NEW: Import and use menu-aware system prompts
          const { getMenuSystemPrompt } = await import('@/lib/llm/menu-prompts');
          
          // Detect menu context from determined mode
          let menuContext: 'market' | 'data-visualization' | 'reports' | 'letter' | 'chat' = 'chat';
          
          if (detectedMode === RequestMode.MARKET_ANALYSIS) menuContext = 'market';
          else if (detectedMode === RequestMode.LETTER_GENERATOR) menuContext = 'letter';
          else if (detectedMode === RequestMode.REPORT_GENERATOR) menuContext = 'reports';
          else if (detectedMode === RequestMode.BUSINESS_ADMIN) {
             // If on Home page, use Universal Orchestrator. 
             // If explicitly in Viz tab, use Viz persona.
             menuContext = mode === 'chat' ? 'chat' : 'data-visualization';
          }
          
          // Get menu-specific system prompt
          const menuPrompt = getMenuSystemPrompt(menuContext);
          
          // Build context-aware prompt - pass language to global rules
          const globalRules = getGlobalPromptRules(language);
          
          // 🛡️ ANTI-HALLUCINATION V2: Enhanced prompt based on user feedback
          // Deteksi apakah ini file data (CSV/spreadsheet)
          const isDataFile = ragContext && (
            ragContext.includes('[Kolom:') || 
            ragContext.includes('[Data dari') ||
            ragContext.includes('Date,') ||
            ragContext.includes('Open,') ||
            ragContext.includes('Close,')
          );
          
          const antiHallucinationRules = ragContext ? `

${isDataFile ? `
═══════════════════════════════════════════════════════════════
🎯 ROLE: ANALIS DATA KEUANGAN SENIOR DI PLATFORM OXEN
═══════════════════════════════════════════════════════════════

Tugas Anda adalah menganalisis data pasar mentah (CSV/Spreadsheet) yang diberikan user secara AKURAT, FAKTUAL, dan MATEMATIS.

📋 INSTRUKSI UTAMA (WAJIB DIPATUHI):

1. **JANGAN PERNAH MENGARANG DATA**
   - Semua jawaban harus 100% didasarkan pada data yang dilampirkan
   - Jika data tidak ada, katakan "Data tidak tersedia untuk analisis ini"

2. **CARA MENJAWAB PERTANYAAN HARGA:**
   - Jika user bertanya "Harga Tertinggi" → Pindai SELURUH baris kolom Close/High
   - Sebutkan ANGKA EKSAK dan TANGGAL KEJADIAN
   - Contoh benar: "Harga tertinggi adalah 3.196,68 pada tanggal 2025-03-07"

3. **ABAIKAN PENGETAHUAN UMUM**
   - JANGAN gunakan informasi dari internet atau training data
   - Fokus HANYA pada angka dalam dataset yang diberikan

4. **FORMAT DATA SAHAM (OHLC):**
   - Date = Tanggal perdagangan
   - Open = Harga pembukaan hari itu
   - High = Harga TERTINGGI dalam hari itu
   - Low = Harga TERENDAH dalam hari itu
   - Close = Harga PENUTUPAN hari itu
   - Volume = Jumlah transaksi

5. **HANDLE DATA KOSONG (NaN):**
   - Jika ada baris dengan nilai kosong/NaN, ABAIKAN baris tersebut
   - Beri catatan: "Catatan: X baris dengan data tidak lengkap diabaikan"

6. **FORMAT RESPONS PROFESIONAL:**
   - Gunakan Bahasa Indonesia yang profesional
   - Sajikan data kunci dalam format poin (bullet points)
   - Jika ada tren, jelaskan dengan istilah teknikal:
     * Bullish = tren naik (harga meningkat)
     * Bearish = tren turun (harga menurun)
     * Sideways = tren datar/konsolidasi

7. **SELALU MULAI DENGAN:**
   📊 **Struktur Data Terdeteksi:** [sebutkan kolom yang ada]
   📅 **Rentang Data:** [tanggal awal] s/d [tanggal akhir]
   📈 **Total Baris Valid:** [jumlah baris]

` : `
🚨 ATURAN ANALISIS DOKUMEN:

1. HANYA gunakan informasi dari dokumen yang diberikan
2. JANGAN mengarang fakta, angka, atau kategori yang tidak ada
3. Jika informasi tidak tersedia, katakan dengan jelas
4. Identifikasi struktur dokumen sebelum menjawab
`}
═══════════════════════════════════════════════════════════════

` : '';

          const contextPrompt = `${menuPrompt}

${ragContext ? `📄 DATA DARI DOKUMEN USER:\n${ragContext}\n\n${antiHallucinationRules}` : ""}

RESPONSE FORMAT:
- Start directly with the response content.
- JAWABLAH SEPENUHNYA DALAM ${detectedLanguageLabel.toUpperCase()}.
- DILARANG MENGGUNAKAN BAHASA INGGRIS kecuali istilah teknis (Jika Bahasa Indonesia).
- STRICTLY respond in ${detectedLanguageLabel.toUpperCase()} only.
- DO NOT repeat these instructions.`;

          const systemPrompt = `${globalRules}\n\n${contextPrompt}`;

          const filteredHistory = conversationHistory.filter((msg: any) => msg.role !== "system");
          const messages = [
            { role: "system", content: systemPrompt },
            ...filteredHistory,
            { role: "user", content: message },
          ];

          const streamResponse = await llmProvider.generateStreamResponse?.(messages, { 
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

    // ✅ NON-STREAMING: For market analysis, letter generation, and comparison
    // These need structured output (charts, tables) which requires full response
    
    // For comparison requests, we need to extract symbols from conversation history
    // if they're not in the current message
    let enhancedMessage = message;
    if (isComparisonRequest) {
      const currentSymbols = extractMultipleSymbols(message);
      
      console.log('🔍 [Chat API] Current message symbols:', currentSymbols);
      
      // ✅ PRIORITY: If there are 2+ symbols in the current message, use ONLY those
      // Do NOT add more from history - user specified exactly what they want to compare
      if (currentSymbols.length >= 2) {
        console.log('✅ [Chat API] Found 2+ symbols in current message, using those only');
        // Message already has enough symbols, no enhancement needed
        // But still append for clarity in processing
        const symbolsList = currentSymbols.map(s => s.symbol).join(', ');
        enhancedMessage = `${message} (Symbols: ${symbolsList})`;
      } else if (currentSymbols.length === 1) {
        // User mentioned 1 symbol and wants to compare "with other assets"
        // Look in recent history for context, but still require user to specify
        console.log('⚠️ [Chat API] Only 1 symbol in message, looking for context in history...');
        
        // Extract symbols from recent messages only (last 3 messages max)
        const recentMessages = conversationHistory.slice(-3);
        const historySymbols: Array<{ symbol: string; type: 'crypto' | 'stock' }> = [];
        
        for (const msg of recentMessages) {
          const content = msg.content || '';
          // Clean recommendation sections
          let cleanContent = content.replace(/Pertanyaan Lanjutan[\s\S]*$/i, '');
          
          const extracted = extractMultipleSymbols(cleanContent);
          for (const sym of extracted) {
            // Avoid duplicates, limit to 3 additional symbols max
            if (!historySymbols.some(s => s.symbol === sym.symbol) && 
                !currentSymbols.some(s => s.symbol === sym.symbol) &&
                historySymbols.length < 3) {
              historySymbols.push(sym);
            }
          }
        }
        
        console.log('🔍 [Chat API] Recent history symbols (max 3):', historySymbols);
        
        // Combine current symbol with 1 from history to make a pair (total 2)
        // Don't add ALL history symbols
        const currentSymbol = currentSymbols[0];
        const matchingHistorySymbol = historySymbols.find(s => s.type === currentSymbol.type);
        
        if (matchingHistorySymbol) {
          const symbolsList = [currentSymbol.symbol, matchingHistorySymbol.symbol].join(', ');
          enhancedMessage = `${message} (Symbols: ${symbolsList})`;
          console.log('✅ [Chat API] Enhanced message with 1 symbol from current + 1 from history:', symbolsList);
        } else {
          // No matching type in history - user needs to specify more symbols
          console.log('⚠️ [Chat API] No matching symbol type in history, user needs to specify');
        }
      } else {
        // No symbols in current message - user is vague
        // Try to find the last 2 symbols from history if this is a comparison request
        console.log('⚠️ [Chat API] No symbols found in current message, looking for last 2 symbols in history...');
        const recentMessages = conversationHistory.slice(-5);
        const historySymbols: Array<{ symbol: string; type: 'crypto' | 'stock' }> = [];
        
        for (const msg of [...recentMessages].reverse()) {
          const content = msg.content || '';
          let cleanContent = content.replace(/Pertanyaan Lanjutan[\s\S]*$/i, '');
          const extracted = extractMultipleSymbols(cleanContent);
          for (const sym of extracted) {
            if (!historySymbols.some(s => s.symbol === sym.symbol) && historySymbols.length < 5) {
              historySymbols.push(sym);
            }
          }
        }

        if (historySymbols.length >= 2) {
          const symbolsList = historySymbols.slice(0, 2).map(s => s.symbol).join(', ');
          enhancedMessage = `${message} (Symbols: ${symbolsList})`;
          console.log('✅ [Chat API] Enhanced message with 2 symbols from history:', symbolsList);
        } else {
          console.log('⚠️ [Chat API] Could not find enough symbols in history for comparison');
        }
      }
    }

    // ✅ RAG: Build context from relevant documents
    let ragContextText = '';
    let usedDocumentIds: string[] = [];

    try {
      // Pass fileIds to focus search if provided
      const ragResult = await buildRAGContext(enhancedMessage, user.id, fileIds.length > 0 ? fileIds : undefined);
      if (ragResult.hasRelevantDocs) {
        ragContextText = ragResult.contextText;
        usedDocumentIds = ragResult.documents.map(d => d.id);
        console.log(`📚 [RAG] Found ${ragResult.documents.length} relevant documents`);
      }
    } catch (ragError) {
      console.warn('RAG context build failed, continuing without:', ragError);
    }

    // 🌐 WEB SEARCH: Get real-time data if enabled
    let searchContextText = '';
    if (webSearch) {
      try {
        console.log(`🌐 [WebSearch] Searching for: ${enhancedMessage}`);
        searchContextText = await buildSearchContext(enhancedMessage);
      } catch (searchError) {
        console.warn('Web search failed:', searchError);
      }
    }
    
    // Combine contexts
    const fullRagContext = `${ragContextText}\n\n${searchContextText}`.trim();

    const context: AIRequestContext = {
      message: enhancedMessage,
      conversationHistory,
      stream: false,
      mode: detectedMode, // Pass the detected mode for consistent handler routing
      ragContext: fullRagContext || undefined, // Pass RAG + Search context to router
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
      } else if (structuredOutput.action === 'show_chart') {
         // ✅ FIX: Map flat structured output to ChartData object if 'chart' prop is missing
         // This handles the Business Chart case from the handler
         console.log('📊 [Chat API] Constructing finalChart from StructuredOutput');
         finalChart = {
            ...structuredOutput,
            type: structuredOutput.chart_type || structuredOutput.type || 'bar',
            title: structuredOutput.title || 'Data Visualization',
            data: structuredOutput.data || [],
            xKey: structuredOutput.xKey || 'name',
            yKey: structuredOutput.yKey || 'value',
            // Explicitly preserve comparison fields to avoid loss during reconstruction
            comparisonAssets: structuredOutput.comparisonAssets || (routerResponse.chart?.comparisonAssets) || undefined,
            timeframe: structuredOutput.timeframe || (routerResponse.chart?.timeframe) || undefined,
            asset_type: structuredOutput.asset_type || (routerResponse.chart?.asset_type) || undefined,
         };
         
         // Use the message from structured output if response text is empty/placeholder
         if (!isValidAnalysisMessage(finalResponse) && structuredOutput.message) {
            finalResponse = structuredOutput.message;
         }
      }

      if (structuredOutput.table) {
        finalTable = structuredOutput.table;
      }
      if (structuredOutput.message && isValidAnalysisMessage(structuredOutput.message)) {
        finalResponse = structuredOutput.message;
      }
    }

    // If no chart but market analysis was the intended mode, try to generate one
    if (!finalChart && detectedMode === RequestMode.MARKET_ANALYSIS && marketInfo.symbol) {
      try {
        const visualization = await generateVisualization(message);
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
    
    // REDUNDANT BLOCK REMOVED: Business chart generation is now handled in the Handler (processBusinessAdmin)
    // The previous block "if (!finalChart && needsChart ...)" is deleted to avoid double generation.

    // 🎨 IMAGE GEN: Generate business visual if enabled and AI thinks it is appropriate
    // Or if the user explicitly asked for a visualization that can be an image
    let generatedImageUrl = routerResponse.imageUrl;
    if (imageGen && !generatedImageUrl) {
        const needsImage = lowerMessage.includes('buat gambar') || 
                           lowerMessage.includes('buatkan gambar') ||
                           lowerMessage.includes('buatkan saya gambar') ||
                           lowerMessage.includes('generate image') ||
                           lowerMessage.includes('create image') ||
                           lowerMessage.includes('ilustrasi') ||
                           lowerMessage.includes('illustrasi') ||
                           lowerMessage.includes('buatkan ilustrasi') ||
                           lowerMessage.includes('buatkan illustrasi') ||
                           lowerMessage.includes('buatkan saya ilustrasi') ||
                           lowerMessage.includes('buatkan saya illustrasi') ||
                           lowerMessage.includes('gambar untuk') ||
                           lowerMessage.includes('gambar') ||
                           lowerMessage.includes('foto') ||
                           lowerMessage.includes('desain') ||
                           lowerMessage.includes('logo') ||
                           lowerMessage.includes('poster');
        
        if (needsImage) {
            console.log('🎨 [ImageGen] Generating image for:', finalResponse.substring(0, 100));
            try {
                // Use AI response as the base for prompt enhancement
                const imgUrl = await generateBusinessImage(message);
                if (imgUrl) generatedImageUrl = imgUrl;
            } catch (imgError) {
                console.warn('Image generation failed:', imgError);
            }
        }
    }

    // Build final response
    const response: any = {
      success: true,
      response: finalResponse,
      chart: finalChart,
      table: finalTable,
      imageUrl: generatedImageUrl || undefined,
      structuredOutput: structuredOutput || undefined,
      webSearchActive: !!searchContextText,
      documentAnalysisActive: usedDocumentIds.length > 0,
    };

    // Add mode-specific fields
    if (routerResponse.mode === RequestMode.MARKET_ANALYSIS) {
      if (routerResponse.marketData) response.marketData = routerResponse.marketData;
      if (routerResponse.indicators) response.indicators = routerResponse.indicators;
    }

    if (routerResponse.mode === RequestMode.LETTER_GENERATOR) {
      if (routerResponse.letter) response.letter = routerResponse.letter;
    }

    // 💾 Opsional: Simpan query ke database (non-blocking)
    saveQueryToDatabase(
      supabase,
      user.id,
      message,
      finalResponse,
      routerResponse.mode || 'chat',
      {
        has_chart: !!finalChart,
        has_table: !!finalTable,
        has_image: !!routerResponse.imageUrl,
        conversation_length: conversationHistory.length,
        structured_output: structuredOutput ? true : false,
      }
    );

    // ✅ CACHING: Store response in cache for future use (non-blocking)
    if (shouldCacheQuery(message) && finalResponse) {
      setCachedResponse(message, finalResponse, {
        model: 'gemini-2.0-flash',
        metadata: {
          mode: routerResponse.mode,
          has_chart: !!finalChart,
          has_table: !!finalTable
        }
      }).catch(err => console.warn('Failed to cache response:', err));
    }

    // ✅ USAGE: Log API usage (non-blocking)
    usageTracker.log(user.id, {
      queryType: (routerResponse.mode as any) || 'chat',
      modelUsed: 'gemini-2.0-flash',
      inputTokens: estimateTokens(message),
      outputTokens: estimateTokens(finalResponse),
      cached: false,
      metadata: {
        has_chart: !!finalChart,
        has_table: !!finalTable,
        source_documents: usedDocumentIds
      }
    }).catch(err => console.warn('Failed to log usage:', err));

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
