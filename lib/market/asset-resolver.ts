import axios from 'axios';
import { cachedFetch } from '@/lib/market/coingecko-cache';

export type ResolvedAsset =
  | { type: 'crypto'; symbol: string; coinId: string; name?: string }
  | { type: 'stock'; symbol: string; name?: string };

function cleanToken(s: string): string {
  return s
    .trim()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[,;:\-–—]+|[,;:\-–—]+$/g, '')
    .trim();
}

export function extractCandidateTokens(text: string): string[] {
  const raw = text || '';
  const lowered = raw.toLowerCase();

  // Remove common noise words so extraction is less messy
  const stripped = lowered
    .replace(/(bandingkan|perbandingan|compare|versus|vs|dengan|dan|antara|saham|stock|kripto|crypto|koin|coin|harga|chart|grafik|tampilkan|buatkan|visualisasi)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split by separators (comma, "dan", "&")
  const parts = stripped
    .split(/,|&|\+| dan | versus | vs /i)
    .map(cleanToken)
    .filter(Boolean);

  // Also capture explicit tickers (AAPL, BBCA, GOTO.JK)
  const tickers = Array.from(
    new Set(
      (raw.match(/\b[A-Z]{1,6}(?:\.[A-Z]{1,3})?\b/g) || []).map((t) => t.trim())
    )
  );

  return Array.from(new Set([...tickers, ...parts])).filter((x) => x.length >= 2);
}

export async function resolveCrypto(queryOrSymbol: string): Promise<ResolvedAsset | null> {
  const q = cleanToken(queryOrSymbol);
  if (!q) return null;

  // If user gives a typical crypto ticker, try it as symbol directly via search.
  const cacheKey = `cg:search:${q.toLowerCase()}`;
  const { value } = await cachedFetch(
    cacheKey,
    {
      ttlMs: 24 * 60 * 60 * 1000,
      staleMs: 7 * 24 * 60 * 60 * 1000,
      isRateLimitError: (err) => err?.response?.status === 429,
    },
    async () => {
      const res = await axios.get(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, {
        timeout: 12_000,
        headers: { Accept: 'application/json' },
      });
      return res.data;
    }
  );

  const coins: any[] = value?.coins || [];
  if (!Array.isArray(coins) || coins.length === 0) return null;

  const qLower = q.toLowerCase();
  const exact = coins.find(
    (c) =>
      String(c?.symbol || '').toLowerCase() === qLower ||
      String(c?.id || '').toLowerCase() === qLower ||
      String(c?.name || '').toLowerCase() === qLower
  );
  const best = exact || coins[0];
  if (!best?.id || !best?.symbol) return null;

  return {
    type: 'crypto',
    symbol: String(best.symbol).toUpperCase(),
    coinId: String(best.id),
    name: best.name,
  };
}

export async function resolveStock(queryOrSymbol: string): Promise<ResolvedAsset | null> {
  const q = cleanToken(queryOrSymbol);
  if (!q) return null;

  // If looks like a ticker already (AAPL, BBCA, GOTO.JK), accept as-is.
  if (/^[A-Z]{1,6}(\.[A-Z]{1,3})?$/.test(q)) {
    return { type: 'stock', symbol: q.toUpperCase() };
  }

  const cacheKey = `yf:search:${q.toLowerCase()}`;
  const { value } = await cachedFetch(
    cacheKey,
    {
      ttlMs: 24 * 60 * 60 * 1000,
      staleMs: 7 * 24 * 60 * 60 * 1000,
      isRateLimitError: (err) => err?.response?.status === 429,
    },
    async () => {
      const res = await axios.get(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}`, {
        timeout: 12_000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      });
      return res.data;
    }
  );

  const quotes: any[] = value?.quotes || [];
  if (!Array.isArray(quotes) || quotes.length === 0) return null;

  // Prefer equities
  const equity = quotes.find((x) => String(x?.quoteType || '').toLowerCase() === 'equity') || quotes[0];
  const sym = equity?.symbol;
  if (!sym) return null;

  return {
    type: 'stock',
    symbol: String(sym).toUpperCase(),
    name: equity?.shortname || equity?.longname || equity?.name,
  };
}


