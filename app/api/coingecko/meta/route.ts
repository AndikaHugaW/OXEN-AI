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
 * Coin meta for UI (name + logo image URLs).
 * Uses CoinGecko /coins/{id} with minimal params.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { symbol } = body;
    if (Array.isArray(symbol)) symbol = symbol[0];
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ success: false, error: 'Symbol must be a string' }, { status: 400 });
    }

    const coinId = normalizeCryptoSymbolToCoinId(symbol);
    const url =
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}` +
      `?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;

    const cacheKey = `cg:meta:${coinId}`;
    const { value } = await cachedFetch(
      cacheKey,
      {
        ttlMs: 24 * 60 * 60 * 1000, // 24h
        staleMs: 7 * 24 * 60 * 60 * 1000, // 7d stale ok
        isRateLimitError: (err) => err?.response?.status === 429,
      },
      async () => {
        const res = await axios.get(url, {
          timeout: 12_000,
          headers: { Accept: 'application/json' },
        });
        return res.data;
      }
    );

    const name = value?.name;
    const image = value?.image || {};

    return NextResponse.json({
      success: true,
      source: 'coingecko',
      data: {
        id: coinId,
        symbol: String(value?.symbol || symbol).toUpperCase(),
        name: name || symbol.toUpperCase(),
        image: {
          thumb: image.thumb,
          small: image.small,
          large: image.large,
        },
      },
    });
  } catch (error: any) {
    const status = error?.response?.status;
    const message = error?.response?.data?.error || error?.message || 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coin meta', message, status },
      { status: status === 429 ? 429 : 500 }
    );
  }
}


