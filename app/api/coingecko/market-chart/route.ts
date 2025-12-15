import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cachedFetch } from '@/lib/market/coingecko-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeCryptoSymbolToCoinId(symbol: string): string {
  const mapping: Record<string, string> = {
    btc: 'bitcoin',
    eth: 'ethereum',
    bnb: 'binancecoin',
    sol: 'solana',
    ada: 'cardano',
    xrp: 'ripple',
    dot: 'polkadot',
    matic: 'matic-network',
    avax: 'avalanche-2',
    doge: 'dogecoin',
    ltc: 'litecoin',
    link: 'chainlink',
    atom: 'cosmos',
    etc: 'ethereum-classic',
    xlm: 'stellar',
    algo: 'algorand',
    vet: 'vechain',
    icp: 'internet-computer',
    trx: 'tron',
  };

  const normalized = symbol.toLowerCase();
  return mapping[normalized] || normalized;
}

/**
 * Proxy khusus CoinGecko market_chart (prices) untuk line/area chart.
 * Endpoint CoinGecko: /api/v3/coins/{id}/market_chart?vs_currency=usd&days={days}
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { symbol, days = 7, vs_currency = 'usd' } = body;

    if (Array.isArray(symbol)) symbol = symbol[0];
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Symbol must be a string' },
        { status: 400 }
      );
    }

    // CoinGecko supports days as number or "max"
    const daysParamRaw = typeof days === 'string' ? days.toLowerCase() : days;
    const safeDays: number | 'max' =
      daysParamRaw === 'max'
        ? 'max'
        : Math.min(Math.max(Number(daysParamRaw) || 7, 1), 3650); // up to ~10y
    const coinId = normalizeCryptoSymbolToCoinId(symbol);

    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${encodeURIComponent(
      vs_currency
    )}&days=${safeDays}`;

    const cacheKey = `cg:market_chart:${coinId}:${vs_currency}:${safeDays}`;
    const { value: responseData } = await cachedFetch(
      cacheKey,
      {
        ttlMs: safeDays === 'max' ? 300_000 : 60_000, // cache max longer
        staleMs: 600_000, // allow stale for 10m if rate-limited
        isRateLimitError: (err) => err?.response?.status === 429,
      },
      async () => {
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
        return response.data;
      }
    );

    // response.data.prices => [ [timestampMs, price], ... ]
    const prices: Array<[number, number]> = responseData?.prices || [];
    const volumes: Array<[number, number]> = responseData?.total_volumes || [];

    const formatted = prices
      .filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(([ts, price], idx) => {
        const vol = volumes[idx]?.[1];
        return {
          t: ts,
          time: new Date(ts).toISOString(),
          price,
          volume: Number.isFinite(vol) ? vol : undefined,
        };
      });

    const currentPrice = formatted.length ? formatted[formatted.length - 1].price : undefined;
    const firstPrice = formatted.length ? formatted[0].price : undefined;
    const periodChangePct =
      currentPrice !== undefined && firstPrice !== undefined && firstPrice !== 0
        ? ((currentPrice - firstPrice) / firstPrice) * 100
        : undefined;

    return NextResponse.json({
      success: true,
      source: 'coingecko',
      data: {
        symbol: symbol.toUpperCase(),
        days: safeDays,
        series: formatted,
        currentPrice,
        periodChangePct,
      },
    });
  } catch (error: any) {
    const status = error?.response?.status;
    const message = error?.response?.data?.error || error?.message || 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market chart', message, status },
      { status: status === 429 ? 429 : 500 }
    );
  }
}


