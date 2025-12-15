import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoData, fetchStockData, calculateIndicators } from '@/lib/market/data-fetcher';
import { timeframeToDays } from '@/lib/market/timeframe-utils';

// Disable caching untuk market data (data real-time harus selalu fresh)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  console.log('📊 [Market API] Request received');
  
  try {
    const body = await request.json();
    let { symbol, type = 'crypto', days = 7, timeframe } = body;

    // If timeframe is provided, convert to days using shared utility
    if (timeframe && !days) {
      days = timeframeToDays(timeframe);
      console.log(`📊 [Market API] Converted timeframe ${timeframe} to ${days} days`);
    }

    console.log('📊 [Market API] Request params:', { symbol, type, days, timeframe });

    // Handle case where symbol might be an array (should not happen, but handle gracefully)
    if (Array.isArray(symbol)) {
      console.warn('⚠️ [Market API] Symbol is an array, taking first element:', symbol);
      symbol = symbol[0];
    }

    if (!symbol || typeof symbol !== 'string') {
      console.warn('⚠️ [Market API] Invalid symbol:', symbol);
      return NextResponse.json(
        {
          success: false,
          error: 'Symbol must be a string',
          message: `Invalid symbol format: ${typeof symbol === 'object' ? JSON.stringify(symbol) : symbol}`,
        },
        { status: 400 }
      );
    }

    let marketData;
    try {
      console.log(`📡 [Market API] Fetching ${type} data for ${symbol}...`);
      
      if (type === 'crypto') {
        marketData = await fetchCryptoData(symbol, days);
      } else {
        marketData = await fetchStockData(symbol, days);
      }

      console.log(`✅ [Market API] Data fetched: ${marketData.data.length} data points`);

      // Calculate technical indicators
      const indicators = calculateIndicators(marketData.data);
      console.log('✅ [Market API] Indicators calculated:', indicators);

      return NextResponse.json({
        success: true,
        data: marketData,
        indicators,
      });
    } catch (fetchError: any) {
      // DETAILED ERROR LOGGING
      console.error('❌ [Market API] Fetch error:', {
        symbol,
        type,
        days,
        error: fetchError.message,
        stack: fetchError.stack,
        name: fetchError.name,
      });
      
      // Return error with helpful message
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch market data',
          message: fetchError.message || 'Unknown error',
          details: {
            symbol,
            type,
            errorType: fetchError.name,
          },
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // DETAILED ERROR LOGGING untuk parse errors, dll
    console.error('❌ [Market API] Request error:', {
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
