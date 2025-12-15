/* Simple in-memory cache + in-flight dedupe for CoinGecko calls.
 * Goal: avoid rate limiting (429) by coalescing concurrent requests and serving cached data.
 *
 * Note: This is best-effort. In serverless cold starts cache resets, but in dev/self-host it helps a lot.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number; // fresh until
  staleUntil: number; // serve stale until (when upstream rate-limited)
};

type CacheResult<T> = {
  value: T;
  state: 'hit' | 'miss' | 'stale';
};

declare global {
  // eslint-disable-next-line no-var
  var __coingeckoCache: Map<string, CacheEntry<any>> | undefined;
  // eslint-disable-next-line no-var
  var __coingeckoInflight: Map<string, Promise<any>> | undefined;
}

function getMaps() {
  const cache = globalThis.__coingeckoCache ?? (globalThis.__coingeckoCache = new Map());
  const inflight = globalThis.__coingeckoInflight ?? (globalThis.__coingeckoInflight = new Map());
  return { cache, inflight };
}

export function getCached<T>(key: string): CacheResult<T> | null {
  const { cache } = getMaps();
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const now = Date.now();
  if (entry.expiresAt > now) return { value: entry.value, state: 'hit' };
  if (entry.staleUntil > now) return { value: entry.value, state: 'stale' };
  return null;
}

export function setCached<T>(key: string, value: T, ttlMs: number, staleMs: number) {
  const { cache } = getMaps();
  const now = Date.now();
  cache.set(key, {
    value,
    expiresAt: now + ttlMs,
    staleUntil: now + staleMs,
  });
}

export async function cachedFetch<T>(
  key: string,
  opts: {
    ttlMs: number;
    staleMs: number;
    /** Return true if error indicates rate limit (HTTP 429) */
    isRateLimitError?: (err: any) => boolean;
  },
  fetcher: () => Promise<T>
): Promise<CacheResult<T>> {
  const cached = getCached<T>(key);
  if (cached?.state === 'hit') return cached;

  const { inflight } = getMaps();
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    const value = await existing;
    return { value, state: cached?.state === 'stale' ? 'stale' : 'hit' };
  }

  const p = (async () => {
    const value = await fetcher();
    setCached(key, value, opts.ttlMs, opts.staleMs);
    return value;
  })();

  inflight.set(key, p);
  try {
    const value = await p;
    return { value, state: cached ? cached.state : 'miss' };
  } catch (err: any) {
    // if upstream is rate-limiting and we have stale cache, serve it
    if (opts.isRateLimitError?.(err)) {
      const stale = getCached<T>(key);
      if (stale?.state === 'stale') {
        return stale;
      }
    }
    throw err;
  } finally {
    inflight.delete(key);
  }
}


