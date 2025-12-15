import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cachedFetch } from '@/lib/market/coingecko-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Fetch OHLC data from Polygon Aggregates (aggs) endpoint.
 * Requires POLYGON_API_KEY in server env.
 *
 * Body:
 * - symbol: string (ticker)
 * - timespan: "minute" | "hour" | "day" (default "day")
 * - multiplier: number (default 1)
 * - from: ISO date string or YYYY-MM-DD
 * - to: ISO date string or YYYY-MM-DD
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
    let { symbol, timespan = 'day', multiplier = 1, from, to } = body;

    if (Array.isArray(symbol)) symbol = symbol[0];
    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json({ success: false, error: 'Symbol must be a string' }, { status: 400 });
    }
    if (!from || !to) {
      return NextResponse.json({ success: false, error: '`from` and `to` are required' }, { status: 400 });
    }

    const ticker = symbol.toUpperCase();
    const m = Number(multiplier) || 1;
    const span = String(timespan);

    const url =
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${m}/${encodeURIComponent(span)}` +
      `/${encodeURIComponent(from)}/${encodeURIComponent(to)}?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(apiKey)}`;

    const cacheKey = `poly:aggs:${ticker}:${m}:${span}:${from}:${to}`;
    const { value: aggJson } = await cachedFetch(
      cacheKey,
      {
        ttlMs: 60_000,
        staleMs: 600_000,
        isRateLimitError: (err) => err?.response?.status === 429,
      },
      async () => {
        const res = await axios.get(url, { timeout: 15_000, headers: { Accept: 'application/json' } });
        return res.data;
      }
    );

    const results = aggJson?.results || [];
    const formatted = results
      .filter((r: any) => r && Number.isFinite(r.t) && Number.isFinite(r.o) && Number.isFinite(r.h) && Number.isFinite(r.l) && Number.isFinite(r.c))
      .map((r: any) => ({
        time: new Date(r.t).toISOString(),
        open: r.o,
        high: r.h,
        low: r.l,
        close: r.c,
        volume: Number.isFinite(r.v) ? r.v : undefined,
      }));

    return NextResponse.json({
      success: true,
      source: 'polygon',
      data: {
        symbol: ticker,
        data: formatted,
        meta: {
          timespan: span,
          multiplier: m,
          from,
          to,
          resultsCount: formatted.length,
        },
      },
    });
  } catch (error: any) {
    const status = error?.response?.status;
    const message = error?.response?.data?.error || error?.message || 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Polygon aggregates', message, status },
      { status: status === 429 ? 429 : 500 }
    );
  }
}


