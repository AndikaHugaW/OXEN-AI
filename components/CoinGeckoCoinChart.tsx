'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { timeframeToDays } from '@/lib/market/timeframe-utils';

type Timeframe = '1D' | '7D' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'MAX';

const TIMEFRAMES: Timeframe[] = ['1D', '7D', '1M', '3M', '6M', '1Y', 'YTD', 'MAX'];

const COMPARE_OPTIONS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'LTC', 'LINK', 'TRX'] as const;

// High-contrast palette for compare mode (up to 4 series on screen)
const SERIES_COLORS = [
  '#ff6b3d', // orange-red (primary)
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#ef4444', // red
  '#14b8a6', // teal
  '#eab308', // yellow
  '#ec4899', // pink
];

function timeframeToDaysCoinGecko(tf: Timeframe): number {
  // Reuse existing mapping where possible; add extra ones needed for the UI
  if (tf === '7D') return 7;
  if (tf === '3M') return 90;
  return timeframeToDays(tf);
}

function formatUsdShort(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol', // yields "US$"
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
}

function formatPct(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatTooltipTime(iso: string): string {
  const d = new Date(iso);
  // Try to match screenshot style: "14 Des 2025, 13.10.54 WIB"
  const date = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(d)
    .replace(/:/g, '.');
  return `${date}, ${time} WIB`;
}

function symbolToName(symbol?: string): string {
  const s = (symbol || '').toUpperCase();
  const map: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    BNB: 'BNB',
    XRP: 'XRP',
    ADA: 'Cardano',
    DOGE: 'Dogecoin',
    DOT: 'Polkadot',
    LTC: 'Litecoin',
    LINK: 'Chainlink',
    TRX: 'TRON',
  };
  return map[s] || s || 'Crypto';
}

function symbolToOkxInstId(symbol: string, quote: 'USDT' | 'USD' = 'USDT'): string {
  return `${symbol.toUpperCase()}-${quote}`;
}

export default function CoinGeckoCoinChart({
  symbol,
  initialTimeframe = '7D',
  className,
}: {
  symbol: string;
  initialTimeframe?: Timeframe;
  className?: string;
}) {
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<Array<{ t: number; time: string; price: number; volume?: number }>>([]);
  const [currentPrice, setCurrentPrice] = useState<number | undefined>(undefined); // raw latest price
  const [displayPrice, setDisplayPrice] = useState<number | undefined>(undefined); // animated price
  const [periodChangePct, setPeriodChangePct] = useState<number | undefined>(undefined);
  const [liveChange24h, setLiveChange24h] = useState<number | undefined>(undefined);
  const [lastLiveTickAt, setLastLiveTickAt] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const [compareSeries, setCompareSeries] = useState<Record<string, Array<{ t: number; time: string; price: number }>>>({});
  const [comparePrices, setComparePrices] = useState<Record<string, number>>({}); // Store current prices for compare symbols
  const [seriesPollMs, setSeriesPollMs] = useState<number>(120_000);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [liveSource, setLiveSource] = useState<'okx' | 'coingecko'>('okx');
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('closed');
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [coinMetaName, setCoinMetaName] = useState<string | null>(null);
  const [coinLogoUrl, setCoinLogoUrl] = useState<string | null>(null);
  const coinName = useMemo(() => coinMetaName || symbolToName(symbol), [coinMetaName, symbol]);
  const pairLabel = useMemo(() => `${symbol.toUpperCase()}/USD`, [symbol]);

  const animateNumber = useCallback((from: number, to: number, durationMs = 450) => {
    const start = performance.now();
    const delta = to - from;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayPrice(from + delta * eased);
      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, []);

  const fetchSeries = useCallback(
    async (tf: Timeframe) => {
      setLoading(true);
      setError(null);
      try {
        const days: number | 'max' = tf === 'MAX' ? 'max' : timeframeToDaysCoinGecko(tf);
        const res = await fetch('/api/coingecko/market-chart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ symbol, days }),
        });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!json?.success) throw new Error(json?.message || 'Failed to fetch data');
        setPoints(json.data.series || []);
        const newPrice = json.data.currentPrice;
        setCurrentPrice(newPrice);
        if (typeof newPrice === 'number') {
          setDisplayPrice((prev) => {
            if (typeof prev === 'number' && prev !== newPrice) animateNumber(prev, newPrice);
            return prev ?? newPrice;
          });
        }
        setPeriodChangePct(json.data.periodChangePct);
      } catch (e: any) {
        setError(e?.message || 'Failed to load chart');
        // Backoff series polling on rate limit
        if (String(e?.message || '').includes('429')) {
          setSeriesPollMs((ms) => Math.min(ms * 2, 300_000));
        }
      } finally {
        setLoading(false);
      }
    },
    [symbol]
  );

  useEffect(() => {
    fetchSeries(timeframe);
  }, [timeframe, fetchSeries]);

  const fetchCompareSeries = useCallback(
    async (sym: string) => {
      const tf = timeframe;
      const days: number | 'max' = tf === 'MAX' ? 'max' : timeframeToDaysCoinGecko(tf);
      const res = await fetch('/api/coingecko/market-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ symbol: sym, days }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || 'Failed to fetch compare data');
      const series = (json.data.series || []).map((p: any) => ({ t: p.t, time: p.time, price: p.price }));
      const currentPrice = json.data.currentPrice || (series.length > 0 ? series[series.length - 1].price : undefined);
      
      // Store current price for this symbol
      if (currentPrice !== undefined) {
        setComparePrices(prev => ({ ...prev, [sym.toUpperCase()]: currentPrice }));
      }
      
      return { sym, series, currentPrice };
    },
    [timeframe]
  );

  useEffect(() => {
    // when timeframe changes, refresh compare series too
    if (!compareSymbols.length) {
      setCompareSeries({});
      setComparePrices({});
      return;
    }
    let cancelled = false;
    console.log('📊 Fetching compare series for:', compareSymbols);
    Promise.all(compareSymbols.map((s) => fetchCompareSeries(s).catch((err) => {
      console.error(`❌ Failed to fetch compare series for ${s}:`, err);
      return null;
    }))).then((res) => {
      if (cancelled) return;
      const next: Record<string, Array<{ t: number; time: string; price: number }>> = {};
      const prices: Record<string, number> = {};
      for (const item of res) {
        if (item) {
          next[item.sym] = item.series;
          if (item.currentPrice !== undefined) {
            prices[item.sym] = item.currentPrice;
          }
        }
      }
      console.log('✅ Compare series fetched:', { series: Object.keys(next), prices });
      setCompareSeries(next);
      setComparePrices(prev => ({ ...prev, ...prices }));
    });
    return () => {
      cancelled = true;
    };
  }, [compareSymbols, fetchCompareSeries]);

  const fetchLivePriceFallbackCoinGecko = useCallback(async () => {
    // Fallback when WS is not available (or user switches source)
    try {
      const res = await fetch('/api/coingecko/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ symbol }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.success) return;

      const price = json?.data?.price;
      const change24h = json?.data?.change24h;
      const tickTime = json?.data?.time;

      if (typeof price === 'number' && price > 0) {
        setCurrentPrice((prev) => {
          if (typeof prev === 'number' && prev !== price) animateNumber(prev, price);
          return price;
        });
        setDisplayPrice((prev) => (typeof prev === 'number' ? prev : price));
      }

      if (typeof change24h === 'number') setLiveChange24h(change24h);
      if (typeof tickTime === 'string') setLastLiveTickAt(tickTime);
    } catch {
      // silent
    }
  }, [symbol, animateNumber]);

  // Realtime behavior:
  // - Poll simple/price frequently for snappy "live" feeling
  // - Refresh full series less often
  useEffect(() => {
    const onVis = () => setIsPageVisible(!document.hidden);
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!isPageVisible) return;

    // refresh series periodically
    fetchSeries(timeframe).catch(() => {});
    const seriesTimer = setInterval(() => fetchSeries(timeframe).catch(() => {}), seriesPollMs);

    return () => {
      clearInterval(seriesTimer);
    };
  }, [fetchSeries, timeframe, seriesPollMs, isPageVisible]);

  const connectOkxWs = useCallback(() => {
    if (!isPageVisible) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const instId = symbolToOkxInstId(symbol, 'USDT');
    const url = 'wss://ws.okx.com:8443/ws/v5/public';
    setWsStatus('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('open');
        reconnectAttemptRef.current = 0;

        // subscribe ticker
        ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'tickers', instId }] }));

        // heartbeat (best-effort)
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => {
          try {
            ws.send('ping');
          } catch {
            // ignore
          }
        }, 20_000);
      };

      ws.onmessage = (ev) => {
        try {
          if (typeof ev.data !== 'string') return;
          if (ev.data === 'pong') return;
          const msg = JSON.parse(ev.data);
          if (msg?.event) return; // subscribe/unsubscribe acknowledgements

          if (msg?.arg?.channel === 'tickers' && Array.isArray(msg?.data) && msg.data[0]) {
            const d = msg.data[0];
            const last = Number(d.last);
            const open24h = Number(d.open24h);
            const ts = Number(d.ts);

            if (Number.isFinite(last) && last > 0) {
              setCurrentPrice((prev) => {
                if (typeof prev === 'number' && prev !== last) animateNumber(prev, last);
                return last;
              });
              setDisplayPrice((prev) => (typeof prev === 'number' ? prev : last));
            }

            if (Number.isFinite(last) && Number.isFinite(open24h) && open24h > 0) {
              setLiveChange24h(((last - open24h) / open24h) * 100);
            }

            if (Number.isFinite(ts) && ts > 0) {
              setLastLiveTickAt(new Date(ts).toISOString());
            }
          }
        } catch {
          // ignore malformed events
        }
      };

      ws.onerror = () => {
        setWsStatus('error');
      };

      ws.onclose = () => {
        setWsStatus('closed');
        if (pingTimerRef.current) {
          clearInterval(pingTimerRef.current);
          pingTimerRef.current = null;
        }
        wsRef.current = null;

        // reconnect with backoff
        const attempt = (reconnectAttemptRef.current = reconnectAttemptRef.current + 1);
        const delay = Math.min(30_000, 1000 * Math.pow(2, attempt));
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          connectOkxWs();
        }, delay);
      };
    } catch {
      setWsStatus('error');
    }
  }, [symbol, isPageVisible, animateNumber]);

  useEffect(() => {
    // Fetch coin name + logo using new logo API endpoint
    let cancelled = false;
    setCoinLogoUrl(null);
    setCoinMetaName(null);
    
    (async () => {
      try {
        // First get logo URL from new API
        const logoRes = await fetch('/api/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, type: 'crypto' }),
        });
        
        let logoSet = false;
        if (logoRes.ok) {
          const logoJson = await logoRes.json();
          if (logoJson?.success && !cancelled) {
            // Always use proxy URL first to avoid CORS issues
            const logoToUse = logoJson.proxyUrl || logoJson.logoUrl;
            if (logoToUse) {
              // Verify logo loads before setting
              const img = new Image();
              const logoValid = await new Promise<boolean>((resolve) => {
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = logoToUse;
                setTimeout(() => resolve(false), 5000); // 5 second timeout
              });
              
              if (logoValid && !cancelled) {
                setCoinLogoUrl(logoToUse);
                logoSet = true;
                console.log(`✅ Logo loaded successfully for ${symbol}:`, logoToUse);
              } else {
                console.warn(`⚠️ Logo failed to load for ${symbol}:`, logoToUse);
                // Try direct URL if proxy failed
                if (logoJson.logoUrl && logoJson.logoUrl !== logoToUse && !cancelled) {
                  setCoinLogoUrl(logoJson.logoUrl);
                  logoSet = true;
                }
              }
            }
          }
        }
        
        // Also get name from CoinGecko meta
        const res = await fetch('/api/coingecko/meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'force-cache',
          body: JSON.stringify({ symbol }),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!json?.success) return;
        if (cancelled) return;
        setCoinMetaName(json?.data?.name || null);
        
        // Only set logo if not already set from logo API
        if (!logoSet && !cancelled) {
          const coinLogoUrl = json?.data?.image?.small || json?.data?.image?.thumb || json?.data?.image?.large;
          if (coinLogoUrl) {
            setCoinLogoUrl(coinLogoUrl);
            console.log(`✅ Using CoinGecko meta logo for ${symbol}:`, coinLogoUrl);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch logo for ${symbol}:`, error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    // Manage live source
    if (!isPageVisible) {
      // pause ws when hidden
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
      return;
    }

    if (liveSource === 'okx') {
      connectOkxWs();
    } else {
      // if user wants CoinGecko fallback only
      fetchLivePriceFallbackCoinGecko();
      const t = setInterval(fetchLivePriceFallbackCoinGecko, 20_000);
      return () => clearInterval(t);
    }

    return () => {
      // cleanup reconnect timers on unmount
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [liveSource, connectOkxWs, fetchLivePriceFallbackCoinGecko, isPageVisible]);

  useEffect(() => {
    // On symbol change, reset WS and reconnect
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
    }
    setWsStatus('closed');
    setLiveChange24h(undefined);
    setLastLiveTickAt(null);

    // Fallback tick quickly while WS connects
    if (liveSource === 'coingecko') {
      fetchLivePriceFallbackCoinGecko();
    }
  }, [symbol]);

  const chartData = useMemo(() => {
    // Live update: replace the last point with current price so the line "moves"
    if (!points.length) return [];

    const base = points.map((p) => ({ t: p.t, time: p.time, price: p.price, volume: p.volume }));
    if (typeof currentPrice !== 'number') return base;

    const last = base[base.length - 1];
    const nowIso = new Date().toISOString();
    const shouldAppend =
      new Date(nowIso).getTime() - new Date(last.time).getTime() > 60_000; // if last point older than 60s, append a new live point

    if (shouldAppend) {
      return [...base, { t: Date.now(), time: nowIso, price: currentPrice, volume: last.volume }];
    }

    base[base.length - 1] = { ...last, price: currentPrice };
    return base;
  }, [points, currentPrice]);

  const compareMode = compareSymbols.length > 0;

  const chartDataWithCompare = useMemo(() => {
    if (!compareMode) return chartData;

    const allSymbols = [symbol.toUpperCase(), ...compareSymbols];
    const seriesBySym: Record<string, Array<{ t: number; time: string; price: number }>> = {
      [symbol.toUpperCase()]: chartData.map((p) => ({ t: p.t, time: p.time, price: p.price })),
      ...compareSeries,
    };

    // compute index=100 for each series AND store actual prices
    const indexBySym: Record<string, Record<number, number>> = {};
    const priceBySym: Record<string, Record<number, number>> = {}; // Store actual prices
    for (const s of allSymbols) {
      const pts = seriesBySym[s] || [];
      if (pts.length === 0) {
        console.warn(`⚠️ No data points for ${s} in compare mode`);
        continue;
      }
      const first = pts[0]?.price || 1;
      const indexMap: Record<number, number> = {};
      const priceMap: Record<number, number> = {};
      for (const p of pts) {
        indexMap[p.t] = (p.price / first) * 100;
        priceMap[p.t] = p.price; // Store actual price
      }
      indexBySym[s] = indexMap;
      priceBySym[s] = priceMap;
    }

    // use base timestamps from main series
    // For each timestamp, find the closest matching point in compare series
    return chartData.map((p) => {
      const row: Record<string, any> = { t: p.t, time: p.time, volume: p.volume };
      for (const s of allSymbols) {
        // Try exact match first
        let indexValue = indexBySym[s]?.[p.t];
        let priceValue = priceBySym[s]?.[p.t];
        
        // If no exact match, find closest timestamp
        if (indexValue === undefined || priceValue === undefined) {
          const pts = seriesBySym[s] || [];
          if (pts.length > 0) {
            // Find closest point by timestamp
            let closest = pts[0];
            let minDiff = Math.abs(p.t - closest.t);
            for (const pt of pts) {
              const diff = Math.abs(p.t - pt.t);
              if (diff < minDiff) {
                minDiff = diff;
                closest = pt;
              }
            }
            // Use closest point if within reasonable time window (1 hour)
            if (minDiff < 3600000) {
              const first = pts[0]?.price || 1;
              indexValue = (closest.price / first) * 100;
              priceValue = closest.price;
            }
          }
        }
        
        row[s] = indexValue; // Index for chart
        row[`${s}_price`] = priceValue; // Actual price for tooltip
      }
      return row;
    });
  }, [compareMode, compareSymbols, compareSeries, chartData, symbol]);

  const theme = {
    accent: '#ff6b3d', // orange-red line like screenshot
    bg: '#0b0f14',
    text: 'rgba(255,255,255,0.92)',
    muted: 'rgba(255,255,255,0.6)',
    cardBorder: 'rgba(255,255,255,0.08)',
  };

  const toggleCompare = useCallback(
    (sym: string) => {
      const upper = sym.toUpperCase();
      if (upper === symbol.toUpperCase()) return;
      setCompareSymbols((prev) => {
        const exists = prev.includes(upper);
        const next = exists ? prev.filter((s) => s !== upper) : [...prev, upper].slice(0, 3);
        return next;
      });
    },
    [symbol]
  );

  useEffect(() => {
    // close dropdown when list empty
    if (!compareSymbols.length) {
      setCompareSeries({});
    }
  }, [compareSymbols.length]);

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-4xl rounded-2xl border p-5 shadow-xl',
        'bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(255,107,61,0.10),transparent_40%),radial-gradient(1000px_circle_at_90%_10%,rgba(255,107,61,0.08),transparent_35%)]',
        className
      )}
      style={{ borderColor: theme.cardBorder, backgroundColor: theme.bg }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'rgba(255,107,61,0.15)' }}>
            {coinLogoUrl ? (
              <img
                src={coinLogoUrl}
                alt={`${coinName} logo`}
                className="h-full w-full object-cover"
                loading="eager"
                onError={(e) => {
                  console.warn(`Logo failed to load for ${symbol}, trying fallback...`);
                  const target = e.currentTarget;
                  const currentSrc = target.src;
                  
                  // If proxy URL failed, try direct URL from CoinGecko
                  if (currentSrc.includes('/api/logo')) {
                    fetch('/api/coingecko/meta', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ symbol }),
                    })
                    .then(res => res.json())
                    .then(json => {
                      if (json?.success && json?.data?.image) {
                        // Try large, then thumb, then small
                        const altUrl = json.data.image.large || json.data.image.thumb || json.data.image.small;
                        if (altUrl && altUrl !== currentSrc) {
                          target.src = altUrl;
                        } else {
                          setCoinLogoUrl(null);
                        }
                      } else {
                        setCoinLogoUrl(null);
                      }
                    })
                    .catch(() => setCoinLogoUrl(null));
                  } else {
                    // Direct URL failed, try proxy
                    target.src = `/api/logo?symbol=${encodeURIComponent(symbol)}&type=crypto`;
                    target.onerror = () => setCoinLogoUrl(null);
                  }
                }}
              />
            ) : (
              <span className="text-sm font-bold" style={{ color: theme.accent }} aria-hidden="true">
                {symbol.toUpperCase().slice(0, 1)}
              </span>
            )}
          </div>
          <div>
            <div className="text-lg font-semibold" style={{ color: theme.text }}>
              {coinName}
            </div>
            <div className="text-sm" style={{ color: theme.muted }}>
              {pairLabel}
            </div>
          </div>
        </div>

        {/* Timeframe menu */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition',
                  tf === timeframe ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
                type="button"
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Compare dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setCompareOpen((v) => !v)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition border',
                'border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              )}
              aria-expanded={compareOpen}
            >
              Compare{compareSymbols.length ? ` (${compareSymbols.length})` : ''}
            </button>

            {compareOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-black/80 backdrop-blur-md p-2 z-20">
                <div className="text-[11px] text-white/60 px-2 pb-1">Pilih hingga 3 coin</div>
                <div className="max-h-56 overflow-auto">
                  {COMPARE_OPTIONS.map((opt) => {
                    const isActive = compareSymbols.includes(opt);
                    const disabled = opt === symbol.toUpperCase();
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleCompare(opt)}
                        className={cn(
                          'w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm transition',
                          disabled
                            ? 'text-white/30 cursor-not-allowed'
                            : isActive
                              ? 'bg-white/10 text-white'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <span className="font-semibold">{opt}</span>
                        <span className="text-xs">{isActive ? '✓' : ''}</span>
                      </button>
                    );
                  })}
                </div>
                {!!compareSymbols.length && (
                  <button
                    type="button"
                    onClick={() => setCompareSymbols([])}
                    className="mt-2 w-full px-2 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-200 hover:bg-red-500/25 transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Live source badge */}
          <div className="mt-1 text-[11px] text-white/50">
            Live: {liveSource === 'okx' ? `OKX WS (${wsStatus})` : 'CoinGecko'}
          </div>
        </div>
      </div>

      {/* Price row */}
      <div className="mt-4 flex items-end gap-3">
        <div className="text-4xl font-bold tracking-tight" style={{ color: theme.text }}>
          {displayPrice !== undefined ? formatUsdShort(displayPrice) : '—'}
        </div>
        <div
          className={cn(
            'text-sm font-semibold',
            (liveChange24h ?? periodChangePct) !== undefined && (liveChange24h ?? periodChangePct)! < 0
              ? 'text-red-400'
              : 'text-emerald-400'
          )}
        >
          {liveChange24h !== undefined ? `${formatPct(liveChange24h)} 24H` : periodChangePct !== undefined ? `${formatPct(periodChangePct)} ${timeframe}` : '—'}
        </div>
      </div>

      {/* Compare prices row */}
      {compareMode && compareSymbols.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {compareSymbols.slice(0, 3).map((s, idx) => {
            const price = comparePrices[s];
            return (
              <div
                key={s}
                className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-black/20"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: SERIES_COLORS[(idx + 1) % SERIES_COLORS.length] }}
                  />
                  <span className="text-sm font-semibold text-white/90">{s}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">
                    {price !== undefined ? formatUsdShort(price) : '—'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <div className={cn("mt-3 h-[300px] w-full transition-opacity duration-300", loading ? "opacity-70" : "opacity-100")}>
        {error ? (
          <div className="h-full flex items-center justify-center text-sm text-red-300">
            {error}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartDataWithCompare} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cgFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={theme.accent} stopOpacity={0.0} />
                </linearGradient>
                {compareMode &&
                  [symbol.toUpperCase(), ...compareSymbols].slice(0, 4).map((s, idx) => (
                    <linearGradient key={s} id={`cmpFill-${s}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES_COLORS[idx % SERIES_COLORS.length]} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={SERIES_COLORS[idx % SERIES_COLORS.length]} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p: any = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md">
                      <div className="text-xs text-white/70">{formatTooltipTime(p.time)}</div>
                      {!compareMode ? (
                        <div className="mt-1 text-sm text-white">
                          Harga: <span className="font-semibold">{formatUsdShort(p.price)}</span>
                        </div>
                      ) : (
                        <div className="mt-1 space-y-1">
                          {[symbol.toUpperCase(), ...compareSymbols].slice(0, 4).map((s, idx) => {
                            const actualPrice = p[`${s}_price`] as number | undefined;
                            const indexValue = p[s] as number | undefined;
                            const displayPrice = actualPrice !== undefined ? formatUsdShort(actualPrice) : '—';
                            return (
                              <div key={s} className="text-sm text-white flex items-center justify-between gap-3">
                                <span className="font-semibold" style={{ color: SERIES_COLORS[idx % SERIES_COLORS.length] }}>
                                  {s}
                                </span>
                                <div className="text-right">
                                  <span className="text-white/90">{displayPrice}</span>
                                  {indexValue !== undefined && (
                                    <span className="text-white/50 text-xs ml-2">({indexValue.toFixed(2)} idx)</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          <div className="text-[11px] text-white/50 pt-1">Index=100 (awal periode)</div>
                        </div>
                      )}
                    </div>
                  );
                }}
              />

              {/* Main chart */}
              {!compareMode ? (
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={theme.accent}
                  strokeWidth={2}
                  fill="url(#cgFill)"
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={650}
                  animationEasing="ease-out"
                />
              ) : (
                <>
                  {[symbol.toUpperCase(), ...compareSymbols].slice(0, 4).map((s, idx) => (
                    <Area
                      key={s}
                      type="monotone"
                      dataKey={s}
                      stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
                      strokeWidth={2}
                      fill={`url(#cmpFill-${s})`}
                      fillOpacity={1}
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={650}
                      animationEasing="ease-out"
                    />
                  ))}
                </>
              )}

              {/* Volume mini-bar (always from primary series) */}
              {!compareMode && (
                <Bar
                  dataKey="volume"
                  barSize={3}
                  fill="rgba(255,255,255,0.12)"
                  isAnimationActive={true}
                  animationDuration={500}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between text-xs" style={{ color: theme.muted }}>
        <span>
          {loading ? 'Memuat data…' : lastLiveTickAt ? `Live update: ${formatTooltipTime(lastLiveTickAt)}` : 'Live update aktif'}
        </span>
        <span>
          Powered by <span className="text-white/80">coingecko</span>
        </span>
      </div>
    </div>
  );
}


