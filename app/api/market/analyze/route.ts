// API Route untuk analisis candlestick dengan LLM
import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoData, fetchStockData, calculateIndicators } from '@/lib/market/data-fetcher';
import { preprocessCandlestick } from '@/lib/market/candlestick-preprocessor';
import { getLLMProvider } from '@/lib/llm/providers';

// Disable caching untuk market data analysis (data real-time harus selalu fresh)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  console.log('📊 [Market Analyze API] Request received');
  
  try {
    const body = await request.json();
    let { symbol, type = 'crypto', days = 7, includeLLMAnalysis = true } = body;

    console.log('📊 [Market Analyze API] Request params:', { symbol, type, days, includeLLMAnalysis });

    // Handle case where symbol might be an array
    if (Array.isArray(symbol)) {
      console.warn('⚠️ [Market Analyze API] Symbol is an array, taking first element:', symbol);
      symbol = symbol[0];
    }

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Symbol must be a string',
          message: `Invalid symbol format: ${typeof symbol === 'object' ? JSON.stringify(symbol) : symbol}`,
        },
        { status: 400 }
      );
    }

    // Step 1: Fetch market data
    // Crypto: CoinGecko API (tanpa widget/sumber pihak ketiga)
    // Stock: Yahoo Finance API
    let marketData;
    try {
      console.log(`📡 [Market Analyze API] Step 1: Fetching ${type} data for ${symbol}...`);
      
      if (type === 'crypto') {
        marketData = await fetchCryptoData(symbol, days);
      } else {
        marketData = await fetchStockData(symbol, days);
      }

      console.log(`✅ [Market Analyze API] Data fetched: ${marketData.data.length} data points`);
    } catch (fetchError: any) {
      console.error('❌ [Market Analyze API] Fetch error:', fetchError.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch market data',
          message: fetchError.message || 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Step 2: Calculate technical indicators
    console.log(`🔢 [Market Analyze API] Step 2: Calculating technical indicators...`);
    const indicators = calculateIndicators(marketData.data);
    console.log('✅ [Market Analyze API] Indicators calculated:', indicators);

    // Step 3: Preprocess candlestick data
    console.log(`🔄 [Market Analyze API] Step 3: Preprocessing candlestick data...`);
    const preprocessed = preprocessCandlestick(marketData, indicators);
    console.log('✅ [Market Analyze API] Data preprocessed');

    // Step 4: LLM Analysis (optional)
    let llmAnalysis: string | null = null;
    if (includeLLMAnalysis) {
      try {
        console.log(`🤖 [Market Analyze API] Step 4: Requesting LLM analysis...`);
        const llmProvider = getLLMProvider();
        
        const analysisPrompt = `Sebagai analis teknikal yang berpengalaman, analisis data candlestick berikut dan berikan insight yang actionable:

${preprocessed.formattedForLLM}

Berikan analisis dalam bahasa Indonesia yang mudah dipahami dengan:
1. Interpretasi trend dan pola candlestick yang terdeteksi
2. Analisis RSI, Moving Average, dan indikator teknis lainnya
3. Prediksi singkat untuk beberapa hari ke depan (1-3 kalimat)
4. Rekomendasi trading/investasi (BUY/HOLD/SELL) dengan alasan singkat
5. Level support dan resistance yang penting (jika bisa diidentifikasi)

Format jawaban: ringkas, profesional, dan mudah dipahami.`;

        llmAnalysis = await llmProvider.generateResponse([
          {
            role: 'system',
            content: 'Kamu adalah analis teknikal profesional yang ahli dalam menganalisis candlestick charts dan indikator teknis untuk trading dan investasi.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ], {
          temperature: 0.7,
        });

        console.log('✅ [Market Analyze API] LLM analysis completed');
      } catch (llmError: any) {
        console.error('⚠️ [Market Analyze API] LLM analysis failed:', llmError.message);
        // Continue without LLM analysis
        llmAnalysis = null;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        marketData,
        indicators,
        preprocessed,
        llmAnalysis,
      },
    });
  } catch (error: any) {
    console.error('❌ [Market Analyze API] Request error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
