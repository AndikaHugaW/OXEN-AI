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
 * Proxy CoinGecko simple/price untuk polling harga terbaru (lebih ringan dari market_chart).
 * Endpoint CoinGecko: /api/v3/simple/price?ids={id}&vs_currencies=usd&include_24hr_change=true
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { symbol, vs_currency = 'usd' } = body;

    if (Array.isArray(symbol)) symbol = symbol[0];
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Symbol must be a string' },
        { status: 400 }
      );
    }

    const coinId = normalizeCryptoSymbolToCoinId(symbol);
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      coinId
    )}&vs_currencies=${encodeURIComponent(vs_currency)}&include_24hr_change=true`;

    const cacheKey = `cg:price:${coinId}:${vs_currency}`;
    const { value: responseData } = await cachedFetch(
      cacheKey,
      {
        ttlMs: 15_000, // fresh for 15s
        staleMs: 120_000, // allow stale for 2m if rate-limited
        isRateLimitError: (err) => err?.response?.status === 429,
      },
      async () => {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
        return response.data;
      }
    );

    const payload = responseData?.[coinId] || {};
    const price = payload?.[vs_currency];
    const change24h = payload?.[`${vs_currency}_24h_change`];

    return NextResponse.json({
      success: true,
      source: 'coingecko',
      data: {
        symbol: symbol.toUpperCase(),
        price,
        change24h,
        time: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    const status = error?.response?.status;
    const message = error?.response?.data?.error || error?.message || 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to fetch price', message, status },
      { status: status === 429 ? 429 : 500 }
    );
  }
}


