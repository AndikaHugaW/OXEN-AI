/* Simple in-memory cache for stock data (Yahoo Finance).
 * Goal: reduce API calls and improve response time for comparison requests.
 * 
 * Cache TTL: 60 seconds (fresh), 300 seconds (stale)
 * This is reasonable since stock prices don't change every second.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number; // fresh until
  staleUntil: number; // serve stale until
};

type CacheResult<T> = {
  value: T;
  state: 'hit' | 'miss' | 'stale';
};

declare global {
  // eslint-disable-next-line no-var
  var __stockCache: Map<string, CacheEntry<any>> | undefined;
  // eslint-disable-next-line no-var
  var __stockInflight: Map<string, Promise<any>> | undefined;
}

function getMaps() {
  const cache = globalThis.__stockCache ?? (globalThis.__stockCache = new Map());
  const inflight = globalThis.__stockInflight ?? (globalThis.__stockInflight = new Map());
  return { cache, inflight };
}

export function getCachedStock<T>(key: string): CacheResult<T> | null {
  const { cache } = getMaps();
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const now = Date.now();
  if (entry.expiresAt > now) return { value: entry.value, state: 'hit' };
  if (entry.staleUntil > now) return { value: entry.value, state: 'stale' };
  return null;
}

export function setCachedStock<T>(key: string, value: T, ttlMs: number, staleMs: number) {
  const { cache } = getMaps();
  const now = Date.now();
  cache.set(key, {
    value,
    expiresAt: now + ttlMs,
    staleUntil: now + staleMs,
  });
}

export async function cachedStockFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<CacheResult<T>> {
  const cached = getCachedStock<T>(key);
  if (cached?.state === 'hit') return cached;

  const { inflight } = getMaps();
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    const value = await existing;
    return { value, state: cached?.state === 'stale' ? 'stale' : 'hit' };
  }

  const p = (async () => {
    const value = await fetcher();
    setCachedStock(key, value, 60000, 300000); // 60s fresh, 300s stale
    return value;
  })();

  inflight.set(key, p);
  try {
    const value = await p;
    return { value, state: cached ? cached.state : 'miss' };
  } catch (err) {
    // If we have stale cache, serve it on error
    const stale = getCachedStock<T>(key);
    if (stale?.state === 'stale') {
      return stale;
    }
    throw err;
  } finally {
    inflight.delete(key);
  }
}

