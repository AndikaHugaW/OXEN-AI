import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoData } from '@/lib/market/data-fetcher';
import { timeframeToDays } from '@/lib/market/timeframe-utils';

// Disable caching untuk data crypto (harus fresh)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Proxy khusus CoinGecko untuk data OHLC crypto.
 * Tujuan: memastikan chart crypto selalu memakai CoinGecko (bukan widget/sumber pihak ketiga).
 */
export async function POST(request: NextRequest) {
  console.log('🦎 [CoinGecko OHLC API] Request received');

  try {
    const body = await request.json();
    let { symbol, days = 7, timeframe } = body;

    // Handle case where symbol might be an array
    if (Array.isArray(symbol)) {
      console.warn('⚠️ [CoinGecko OHLC API] Symbol is an array, taking first element:', symbol);
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

    // If timeframe is provided, convert to days using shared utility
    if (timeframe && !days) {
      days = timeframeToDays(timeframe);
      console.log(`📊 [CoinGecko OHLC API] Converted timeframe ${timeframe} to ${days} days`);
    }

    console.log('🦎 [CoinGecko OHLC API] Params:', { symbol, days, timeframe });

    const marketData = await fetchCryptoData(symbol, days);

    return NextResponse.json({
      success: true,
      source: 'coingecko',
      data: marketData,
    });
  } catch (error: any) {
    console.error('❌ [CoinGecko OHLC API] Error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch CoinGecko OHLC data',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


