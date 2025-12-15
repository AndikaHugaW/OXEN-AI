import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cachedFetch } from '@/lib/market/coingecko-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Get near real-time stock quote using Polygon snapshot endpoint.
 * Requires POLYGON_API_KEY in server env.
 *
 * Note: Coverage depends on Polygon plan and market coverage (primarily US equities).
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'POLYGON_API_KEY is not configured',
        message: 'Tambahkan POLYGON_API_KEY ke .env.local agar bisa pakai Polygon untuk saham.',
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    let { symbol } = body;
    if (Array.isArray(symbol)) symbol = symbol[0];
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ success: false, error: 'Symbol must be a string' }, { status: 400 });
    }

    const ticker = symbol.toUpperCase();
    // Snapshot endpoint: US stocks
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${encodeURIComponent(
      ticker
    )}?apiKey=${encodeURIComponent(apiKey)}`;

    const cacheKey = `poly:snapshot:${ticker}`;
    let snapshot: any;
    try {
      const cached = await cachedFetch(
        cacheKey,
        {
          ttlMs: 1000, // 1s cache to support "1s feel" without hammering Polygon
          staleMs: 10_000,
          isRateLimitError: (err) => err?.response?.status === 429,
        },
        async () => {
          const res = await axios.get(url, { timeout: 12_000, headers: { Accept: 'application/json' } });
          return res.data;
        }
      );
      snapshot = cached.value;
    } catch (e: any) {
      // If plan doesn't include snapshot endpoint, fallback to aggregates.
      const st = e?.response?.status;
      if (st !== 401 && st !== 403) {
        throw e;
      }

      // Fallback strategy: use last close from minute/day aggregates (near real-time, not tick-by-tick)
      const now = new Date();
      const fromDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const from = fromDate.toISOString().slice(0, 10);
      const to = now.toISOString().slice(0, 10);

      const aggUrl =
        `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/minute` +
        `/${encodeURIComponent(from)}/${encodeURIComponent(to)}?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(apiKey)}`;

      const aggCacheKey = `poly:quote_fallback_aggs:${ticker}:${from}:${to}`;
      const { value: aggJson } = await cachedFetch(
        aggCacheKey,
        {
          ttlMs: 5_000,
          staleMs: 60_000,
          isRateLimitError: (err) => err?.response?.status === 429,
        },
        async () => {
          const res = await axios.get(aggUrl, { timeout: 15_000, headers: { Accept: 'application/json' } });
          return res.data;
        }
      );

      const results = Array.isArray(aggJson?.results) ? aggJson.results : [];
      const last = results.length ? results[results.length - 1] : null;
      const prev = results.length > 1 ? results[results.length - 2] : null;

      const lastPrice = last?.c;
      const prevClose = prev?.c;
      const changePct =
        typeof lastPrice === 'number' && typeof prevClose === 'number' && prevClose !== 0
          ? ((lastPrice - prevClose) / prevClose) * 100
          : undefined;

      return NextResponse.json({
        success: true,
        source: 'polygon_aggs_fallback',
        data: {
          symbol: ticker,
          price: lastPrice,
          prevClose,
          changePct,
          time: last?.t ? new Date(last.t).toISOString() : new Date().toISOString(),
          note: 'Snapshot endpoint tidak tersedia di plan Polygon Anda (401/403). Menggunakan aggregates sebagai fallback (near real-time, bukan tick 1 detik).',
        },
      });
    }

    const day = snapshot?.ticker?.day;
    const prevDay = snapshot?.ticker?.prevDay;
    const lastTrade = snapshot?.ticker?.lastTrade;

    const lastPrice: number | undefined =
      typeof lastTrade?.p === 'number'
        ? lastTrade.p
        : typeof day?.c === 'number'
          ? day.c
          : undefined;

    const prevClose: number | undefined = typeof prevDay?.c === 'number' ? prevDay.c : undefined;
    const changePct =
      lastPrice !== undefined && prevClose !== undefined && prevClose !== 0
        ? ((lastPrice - prevClose) / prevClose) * 100
        : undefined;

    return NextResponse.json({
      success: true,
      source: 'polygon',
      data: {
        symbol: ticker,
        price: lastPrice,
        prevClose,
        changePct,
        time: lastTrade?.t ? new Date(lastTrade.t).toISOString() : new Date().toISOString(),
      },
    });
  } catch (error: any) {
    const status = error?.response?.status;
    const message = error?.response?.data?.error || error?.message || 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Polygon quote', message, status },
      { status: status === 429 ? 429 : 500 }
    );
  }
}


