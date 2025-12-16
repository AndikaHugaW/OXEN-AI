import { NextRequest, NextResponse } from 'next/server';
import { fetchCryptoData, fetchStockData } from '@/lib/market/data-fetcher';
import { cachedStockFetch } from '@/lib/market/stock-cache';
import { cachedFetch } from '@/lib/market/coingecko-cache';

// Cache market data endpoint - fast response, no LLM
export const maxDuration = 30; // 30 seconds max
export const runtime = 'nodejs';
export const revalidate = 60; // Revalidate every 60 seconds (1 minute)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, type, days = 7 } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'crypto' && type !== 'stock')) {
      return NextResponse.json(
        { success: false, error: 'Type must be "crypto" or "stock"' },
        { status: 400 }
      );
    }

    // ✅ PARALLEL FETCHING for fast response
    const fetchPromises = symbols.map(async (symbol: string) => {
      try {
        if (type === 'crypto') {
          // Use cached fetch for crypto (with rate limit protection)
          const cacheKey = `crypto:${symbol}:${days}`;
          const result = await cachedFetch(
            cacheKey,
            {
              ttlMs: 60000, // 60s fresh
              staleMs: 300000, // 300s stale
              isRateLimitError: (err: any) => err.message?.includes('429') || err.message?.includes('rate limit'),
            },
            () => fetchCryptoData(symbol, days)
          );
          return { symbol, success: true, data: result.value, cached: result.state !== 'miss' };
        } else {
          // Use cached fetch for stocks
          const cacheKey = `stock:${symbol}:${days}`;
          const result = await cachedStockFetch(
            cacheKey,
            () => fetchStockData(symbol, days)
          );
          return { symbol, success: true, data: result.value, cached: result.state !== 'miss' };
        }
      } catch (error: any) {
        console.error(`❌ Error fetching ${type} data for ${symbol}:`, error);
        return {
          symbol,
          success: false,
          error: error.message || 'Unknown error',
        };
      }
    });

    // Wait for all fetches in parallel
    const results = await Promise.all(fetchPromises);

    // Separate successful and failed fetches
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      success: true,
      data: successful.map((r) => ({
        symbol: r.symbol,
        data: r.data,
        cached: r.cached || false,
      })),
      errors: failed.length > 0 ? failed : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Market data API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch market data',
      },
      { status: 500 }
    );
  }
}

