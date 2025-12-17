import { NextRequest, NextResponse } from 'next/server';
import { routeAIRequest, AIRequestContext, getGlobalPromptRules, RequestMode } from '@/lib/llm/ai-request-router';
import { getLLMProvider } from '@/lib/llm/providers';
import { needsVisualization, generateVisualization, needsImage, generateImageUrl, isMarketDataRequest, extractMultipleSymbols } from '@/lib/llm/chart-generator';
import { StructuredResponse } from '@/lib/llm/structured-output';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Import optimization services
import { getCachedResponse, setCachedResponse, shouldCacheQuery } from '@/lib/cache/response-cache';
import { buildRAGContext } from '@/lib/rag/rag-service';
import { createUsageTracker, estimateTokens } from '@/lib/usage/usage-tracker';

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

    const { message, conversationHistory = [], stream = true, mode } = body;

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
    
    // Check mode-specific streaming rules
    // If mode is provided:
    // - MARKET_ANALYSIS: No streaming (needs structured data)
    // - LETTER_GENERATOR: No streaming (needs structured data)
    // - BUSINESS_ADMIN: Stream unless chart is needed
    // - COMPARISON: No streaming (needs structured chart data)
    const isExemptFromStreaming = 
      (mode === RequestMode.MARKET_ANALYSIS) || 
      (mode === RequestMode.LETTER_GENERATOR) ||
      needsChart || 
      isMarketRequest || 
      isLetterRequest ||
      isComparisonRequest; // ← Comparison needs structured chart data

    const shouldStream = useStreaming && llmProvider.generateStreamResponse && !isExemptFromStreaming;

    // ✅ STREAMING FIRST: Always try streaming for LLM responses (even for comparison)
    // Chart will be added to response after streaming completes
    if (shouldStream) {
      // For business admin mode (non-market, non-letter)
       try {
          // Get context from RAG
          let ragContext = "";
          try {
            const ragResult = await buildRAGContext(message, user.id);
            if (ragResult.hasRelevantDocs) {
              ragContext = ragResult.contextText;
              console.log(`📚 [RAG-Stream] Found ${ragResult.documents.length} relevant documents`);
            }
          } catch (ragError) {
            console.warn("RAG retrieval failed, continuing without context:", ragError);
          }

          // Detect language from user message
          const isIndonesian = /[aku|saya|kamu|gimana|bagaimana|tolong|bisa|mau|ingin|punya|dengan|untuk|biar|jelasin|jelaskan|dasar|teori|budget|juta|marketing|alokasi|efektif]/i.test(message);
          const isEnglish = /^[a-zA-Z\s.,!?'"-]+$/.test(message.trim().substring(0, 100));
          const detectedLanguage = isIndonesian ? 'Bahasa Indonesia' : (isEnglish ? 'English' : 'Bahasa Indonesia (default)');
          
          // ✅ NEW: Import and use menu-aware system prompts
          const { getMenuSystemPrompt } = await import('@/lib/llm/menu-prompts');
          
          // Detect menu context from mode (or default to 'chat')
          let menuContext: 'market' | 'data-visualization' | 'reports' | 'letter' | 'chat' = 'chat';
          if (mode === RequestMode.MARKET_ANALYSIS) menuContext = 'market';
          else if (mode === RequestMode.LETTER_GENERATOR) menuContext = 'letter';
          else if (mode === RequestMode.BUSINESS_ADMIN) menuContext = 'data-visualization'; // Default business to visualization for now
          
          // Get menu-specific system prompt
          const menuPrompt = getMenuSystemPrompt(menuContext);
          
          // Build context-aware prompt
          const globalRules = getGlobalPromptRules();
          
          const contextPrompt = `${menuPrompt}

LANGUAGE INSTRUCTION:
- User language: ${detectedLanguage}
- You MUST respond in ${detectedLanguage}.

${ragContext ? `CONTEXT FROM DOCUMENTS:\n${ragContext}\n\n` : ""}

RESPONSE FORMAT:
- Start directly with the response content.
- DO NOT repeat these instructions.
- DO NOT mention system rules or meta-text.`;

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
        // Don't try to guess, let the handler ask for clarification
        console.log('⚠️ [Chat API] No symbols found in current message, will request clarification');
      }
    }

    // ✅ RAG: Build context from relevant documents
    let ragContextText = '';
    let usedDocumentIds: string[] = [];

    try {
      const ragResult = await buildRAGContext(enhancedMessage, user.id);
      if (ragResult.hasRelevantDocs) {
        ragContextText = ragResult.contextText;
        usedDocumentIds = ragResult.documents.map(d => d.id);
        console.log(`📚 [RAG] Found ${ragResult.documents.length} relevant documents`);
      }
    } catch (ragError) {
      console.warn('RAG context build failed, continuing without:', ragError);
    }
    
    const context: AIRequestContext = {
      message: enhancedMessage,
      conversationHistory,
      stream: false,
      ragContext: ragContextText || undefined, // Pass RAG context to router
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
            type: structuredOutput.chart_type || 'bar',
            title: structuredOutput.title || 'Data Visualization',
            data: structuredOutput.data || [],
            xKey: structuredOutput.xKey || 'name',
            yKey: structuredOutput.yKey || 'value',
            // series: if yKey is array, we might want to construct series, but ChartRenderer handles array yKey usually.
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

    // If no chart but market request detected, try to generate one
    if (!finalChart && isMarketRequest && marketInfo.symbol) {
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
