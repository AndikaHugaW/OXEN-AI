'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, X, TrendingUp, TrendingDown, CandlestickChart, AreaChart as AreaChartIcon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { createChart, ColorType, IChartApi, CandlestickSeries } from 'lightweight-charts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/area-chart';

// Map symbol to CoinGecko coin ID
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
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
  trx: 'tron',
  etc: 'ethereum-classic',
  xlm: 'stellar',
  algo: 'algorand',
  vet: 'vechain',
  icp: 'internet-computer',
  near: 'near',
  apt: 'aptos',
  arb: 'arbitrum',
  op: 'optimism',
};

// Chart colors for different coins
const CHART_COLORS = [
  '#06b6d4', // cyan (primary)
  '#a855f7', // purple
  '#22c55e', // green
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
];

// Available coins for comparison
const COMPARE_OPTIONS = [
  { symbol: 'BTC', name: 'Bitcoin', id: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', id: 'ethereum' },
  { symbol: 'BNB', name: 'BNB', id: 'binancecoin' },
  { symbol: 'SOL', name: 'Solana', id: 'solana' },
  { symbol: 'XRP', name: 'XRP', id: 'ripple' },
  { symbol: 'ADA', name: 'Cardano', id: 'cardano' },
  { symbol: 'DOGE', name: 'Dogecoin', id: 'dogecoin' },
  { symbol: 'DOT', name: 'Polkadot', id: 'polkadot' },
  { symbol: 'LTC', name: 'Litecoin', id: 'litecoin' },
  { symbol: 'LINK', name: 'Chainlink', id: 'chainlink' },
  { symbol: 'AVAX', name: 'Avalanche', id: 'avalanche-2' },
  { symbol: 'MATIC', name: 'Polygon', id: 'matic-network' },
];

// Timeframe options
const TIMEFRAMES = ['1D', '7D', '1M', '3M', '6M', '1Y', 'MAX'] as const;
type Timeframe = typeof TIMEFRAMES[number];

// Chart mode
type ChartMode = 'price' | 'percent';

// Chart type
type ChartType = 'area' | 'candlestick';

function getCoinGeckoId(symbol: string): string {
  const normalized = symbol.toLowerCase().trim();
  return SYMBOL_TO_COINGECKO_ID[normalized] || normalized;
}

function getCoinName(symbol: string): string {
  const normalized = symbol.toUpperCase().trim();
  const coin = COMPARE_OPTIONS.find(c => c.symbol === normalized);
  return coin?.name || normalized;
}

function getTimeframeDays(tf: Timeframe): number | 'max' {
  switch(tf) {
    case '1D': return 1;
    case '7D': return 7;
    case '1M': return 30;
    case '3M': return 90;
    case '6M': return 180;
    case '1Y': return 365;
    case 'MAX': return 'max';
    default: return 7;
  }
}

function formatPrice(value: number): string {
  if (value >= 1000) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (value >= 1) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatAxisTime(timestamp: number, timeframe: Timeframe): string {
  const date = new Date(timestamp);
  if (timeframe === '1D') {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  if (timeframe === '7D' || timeframe === '1M') {
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  }
  return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
}

interface PriceData {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

interface CoinInfo {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  color: string;
  logoUrl?: string;
}

interface CoinGeckoWidgetChartProps {
  symbol: string;
  className?: string;
}

// Embedded Candlestick Chart Component using lightweight-charts
interface CandlestickChartEmbedProps {
  symbol: string;
  data: PriceData[];
  timeframe: Timeframe;
}

function CandlestickChartEmbed({ symbol, data, timeframe }: CandlestickChartEmbedProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(6, 182, 212, 0.5)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'rgba(6, 182, 212, 0.9)',
        },
        horzLine: {
          color: 'rgba(6, 182, 212, 0.5)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'rgba(6, 182, 212, 0.9)',
        },
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Convert price data to OHLC format
    // Since we only have close prices, we'll simulate OHLC
    const ohlcData = data.map((item, index) => {
      const price = item[symbol] as number || 0;
      const prevPrice = index > 0 ? (data[index - 1][symbol] as number || price) : price;
      
      // Simulate OHLC from single price points
      const volatility = price * 0.002; // 0.2% volatility simulation
      const open = prevPrice;
      const close = price;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;

      return {
        time: (item.timestamp / 1000) as any, // Convert to seconds
        open,
        high,
        low,
        close,
      };
    }).filter(d => d.time > 0 && !isNaN(d.close));

    if (ohlcData.length > 0) {
      candlestickSeries.setData(ohlcData);
      chart.timeScale().fitContent();
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, symbol, timeframe]);

  return (
    <div 
      ref={chartContainerRef} 
      className="h-[300px] w-full"
      style={{ minHeight: '300px' }}
    />
  );
}

// TradingView Embedded Candlestick Chart for REALTIME data
interface TradingViewCandlestickEmbedProps {
  symbol: string;
  timeframe: Timeframe;
}

// Map timeframe to TradingView interval
const TIMEFRAME_TO_TV_INTERVAL: Record<Timeframe, string> = {
  '1D': '5',      // 5 minute for intraday
  '7D': '30',     // 30 minutes
  '1M': '60',     // 1 hour
  '3M': 'D',      // Daily
  '6M': 'D',      // Daily
  '1Y': 'W',      // Weekly
  'MAX': 'M',     // Monthly
};

// Map symbol to TradingView format
const getCryptoTradingViewSymbol = (symbol: string): string => {
  const normalized = symbol.toUpperCase();
  return `BINANCE:${normalized}USDT`;
};

function TradingViewCandlestickEmbed({ symbol, timeframe }: TradingViewCandlestickEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>(`tradingview_${symbol}_${Date.now()}`);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    const tradingViewSymbol = getCryptoTradingViewSymbol(symbol);
    const interval = TIMEFRAME_TO_TV_INTERVAL[timeframe];
    const containerId = widgetIdRef.current;

    // Create widget container with proper structure
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    
    const widgetInner = document.createElement('div');
    widgetInner.id = containerId;
    widgetInner.style.height = '100%';
    widgetInner.style.width = '100%';
    widgetContainer.appendChild(widgetInner);
    
    containerRef.current.appendChild(widgetContainer);

    // Create and load the TradingView widget script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://s3.tradingview.com/tv.js';
    
    script.onload = () => {
      // @ts-ignore - TradingView global
      if (typeof TradingView !== 'undefined') {
        // @ts-ignore
        new TradingView.widget({
          container_id: containerId,
          autosize: true,
          symbol: tradingViewSymbol,
          interval: interval,
          timezone: 'Asia/Jakarta',
          theme: 'dark',
          style: '1', // Candlestick
          locale: 'id',
          toolbar_bg: '#0b0f14',
          enable_publishing: false,
          allow_symbol_change: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          withdateranges: true,
          hide_side_toolbar: false,
          details: false,
          hotlist: false,
          calendar: false,
          studies: [],
          show_popup_button: false,
          popup_width: '1000',
          popup_height: '650',
        });
      }
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      // Remove script if needed
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol, timeframe]);

  return (
    <div className="h-[320px] w-full overflow-hidden rounded-lg bg-[#0b0f14]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

export default function CoinGeckoWidgetChart({ symbol, className }: CoinGeckoWidgetChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartMode, setChartMode] = useState<ChartMode>('percent');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareCoins, setCompareCoins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<PriceData[]>([]);
  const [coinInfos, setCoinInfos] = useState<CoinInfo[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [rawSeriesData, setRawSeriesData] = useState<Record<string, Array<{ timestamp: number; price: number }>>>({});
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const primarySymbol = symbol.toUpperCase();
  const allSymbols = useMemo(() => [primarySymbol, ...compareCoins], [primarySymbol, compareCoins]);
  
  const isCompareMode = compareCoins.length > 0;
  
  // Force percentage mode when comparing (auto-switch)
  const effectiveChartMode = isCompareMode ? 'percent' : 'price';

  const chartConfig = useMemo((): ChartConfig => {
    const config: ChartConfig = {};
    allSymbols.forEach((sym, index) => {
      config[sym] = {
        label: getCoinName(sym),
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
    return config;
  }, [allSymbols]);

  const normalizedChartData = useMemo(() => {
    if (effectiveChartMode === 'price' || !isCompareMode) {
      return chartData;
    }

    const firstValues: Record<string, number> = {};
    
    for (const sym of allSymbols) {
      const series = rawSeriesData[sym] || [];
      if (series.length > 0) {
        firstValues[sym] = series[0].price;
      }
    }

    const primarySeries = rawSeriesData[primarySymbol] || [];
    
    // Fallback if rawSeriesData is empty but chartData exists (e.g. during transition)
    if (primarySeries.length === 0 && chartData.length > 0) {
      // Try to reconstruct visible data from chartData for primary symbol
      return chartData.map(point => {
         // Create a shallow copy
         const row = { ...point };
         // We can't easily calculate % change without history, 
         // so we might just return the point as is, 
         // but ideally we should wait for rawSeriesData.
         // Given the loading state fix, this block might be less critical 
         // but acts as a safety net to prevent empty render.
         return row;
      });
    }
    
    return primarySeries.map(point => {
      const row: PriceData = { 
        timestamp: point.timestamp,
        time: formatAxisTime(point.timestamp, timeframe),
      };
      
      allSymbols.forEach(sym => {
        const series = rawSeriesData[sym] || [];
        const match = series.find(p => Math.abs(p.timestamp - point.timestamp) < 3600000);
        if (match && firstValues[sym]) {
          const percentChange = ((match.price - firstValues[sym]) / firstValues[sym]) * 100;
          row[sym] = percentChange;
        }
      });
      
      return row;
    });
  }, [chartData, effectiveChartMode, isCompareMode, allSymbols, rawSeriesData, primarySymbol, timeframe]);

  // Fetch coin logo
  const fetchCoinLogo = useCallback(async (sym: string): Promise<string | undefined> => {
    try {
      const response = await fetch('/api/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym, type: 'crypto' }),
      });
      
      if (response.ok) {
        const json = await response.json();
        if (json?.success) {
          return json.proxyUrl || json.logoUrl;
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch logo for ${sym}`);
    }
    return undefined;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const days = getTimeframeDays(timeframe);
      const infos: CoinInfo[] = [];
      const allSeriesData: Record<string, Array<{ timestamp: number; price: number }>> = {};

      for (let i = 0; i < allSymbols.length; i++) {
        const sym = allSymbols[i];
        let retries = 1;
        let success = false;
        
        while (retries >= 0 && !success) {
          try {
            // Fetch market data and logo in parallel
            const [marketResponse, logoUrl] = await Promise.all([
              fetch('/api/coingecko/market-chart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: sym, days }),
              }),
              fetchCoinLogo(sym),
            ]);

            if (marketResponse.status === 429) {
               console.warn(`Rate limited for ${sym}, retrying...`);
               await new Promise(r => setTimeout(r, 1500)); // Longer wait for rate limit
               retries--;
               continue;
            }

            if (!marketResponse.ok) {
              console.warn(`Failed to fetch data for ${sym}: ${marketResponse.status}`);
              retries--;
              if (retries >= 0) await new Promise(r => setTimeout(r, 500));
              continue;
            }

            const json = await marketResponse.json();
            
            if (json.success && json.data) {
              success = true;
              const series = json.data.series || [];
              allSeriesData[sym] = series.map((p: any) => ({
                timestamp: p.t,
                price: p.price,
              }));

              const currentPrice = json.data.currentPrice || series[series.length - 1]?.price || 0;
              const periodChange = json.data.periodChangePct || 0;

              infos.push({
                symbol: sym,
                name: getCoinName(sym),
                currentPrice,
                change: periodChange,
                color: CHART_COLORS[i % CHART_COLORS.length],
                logoUrl,
              });
            } else {
              retries--; // Logic error or empty data, allow retry
            }
          } catch (err) {
            console.warn(`Error fetching ${sym}:`, err);
            retries--;
            if (retries >= 0) await new Promise(r => setTimeout(r, 1000));
          }
        }

        // Increased delay between different coin requests to prevent rate limiting
        if (i < allSymbols.length - 1) {
          await new Promise(r => setTimeout(r, 600)); // Increased from 200ms to 600ms
        }
      }

      const primarySeries = allSeriesData[primarySymbol] || [];
      
      if (primarySeries.length > 0) {
        const mergedData: PriceData[] = primarySeries.map(point => {
          const row: PriceData = { 
            timestamp: point.timestamp,
            time: formatAxisTime(point.timestamp, timeframe),
          };
          
          allSymbols.forEach(sym => {
            const series = allSeriesData[sym] || [];
            const match = series.find(p => Math.abs(p.timestamp - point.timestamp) < 3600000);
            if (match) {
              row[sym] = match.price;
            }
          });
          
          return row;
        });

        setRawSeriesData(allSeriesData);
        setChartData(mergedData);
        setCoinInfos(infos);
        setLastUpdate(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      } else {
        console.warn(`[CoinGeckoWidgetChart] No series data found for primary symbol: ${primarySymbol}`);
        setError(`Data tidak tersedia untuk ${timeframe}`);
      }
    } catch (err: any) {
      console.error('Error fetching chart data:', err);
      setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [allSymbols, primarySymbol, timeframe, fetchCoinLogo]);

  useEffect(() => {
    fetchData();
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(fetchData, 60000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchData]);

  const toggleCompareCoin = useCallback((coinSymbol: string) => {
    setCompareCoins(prev => {
      if (prev.includes(coinSymbol)) {
        return prev.filter(c => c !== coinSymbol);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), coinSymbol];
      }
      return [...prev, coinSymbol];
    });
    setCompareOpen(false);
  }, []);

  const removeCompareCoin = useCallback((coinSymbol: string) => {
    setCompareCoins(prev => prev.filter(c => c !== coinSymbol));
  }, []);

  const availableCompareOptions = useMemo(() => {
    return COMPARE_OPTIONS.filter(
      coin => coin.symbol.toLowerCase() !== symbol.toLowerCase() && 
              !compareCoins.includes(coin.symbol)
    );
  }, [symbol, compareCoins]);

  const priceDomain = useMemo(() => {
    // If in percent mode, we don't need price domain
    if (effectiveChartMode === 'percent') return undefined;
    
    // If no data, return nice default
    if (!chartData || chartData.length === 0) return ['auto', 'auto'];
    
    let min = Infinity;
    let max = -Infinity;
    let hasValidData = false;
    
    chartData.forEach(point => {
      allSymbols.forEach(sym => {
        const val = point[sym];
        // STRICT FILTER: Ignore 0, null, undefined, or extremely small values that might be artifacts
        if (typeof val === 'number' && !isNaN(val) && val > 0.00000001) {
          if (val < min) min = val;
          if (val > max) max = val;
          hasValidData = true;
        }
      });
    });
    
    // Fallback if no valid data found
    if (!hasValidData || min === Infinity || max === -Infinity) return ['auto', 'auto'];
    
    // Add dynamic padding based on volatility
    const range = max - min;
    // If range is 0 (price flat), add 2% padding. If range exists, add 5% of range as padding.
    const padding = range === 0 ? max * 0.02 : range * 0.1; 
    
    // Calculate final domain with padding
    const domainMin = Math.max(0, min - padding); // Never go below 0
    const domainMax = max + padding;

    return [domainMin, domainMax];
  }, [chartData, allSymbols, effectiveChartMode]);

  const percentDomain = useMemo(() => {
    if (effectiveChartMode !== 'percent') return undefined;
    
    let min = 0;
    let max = 0;
    
    normalizedChartData.forEach(point => {
      allSymbols.forEach(sym => {
        const val = point[sym] as number;
        if (typeof val === 'number' && !isNaN(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    });
    
    // Add 10% padding for percent mode
    const padding = Math.max(Math.abs(min), Math.abs(max)) * 0.1;
    return [min - padding, max + padding];
  }, [normalizedChartData, allSymbols, effectiveChartMode]);

  return (
    <div 
      className={cn(
        "w-full max-w-4xl mx-auto rounded-2xl border p-5 shadow-xl",
        "bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(6,182,212,0.08),transparent_40%),radial-gradient(1000px_circle_at_90%_10%,rgba(6,182,212,0.06),transparent_35%)]",
        className
      )}
      style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#0b0f14' }}
    >
      {/* Header - Coin Info Cards */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {coinInfos.map((coin, index) => (
          <div 
            key={coin.symbol}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
              "bg-black/40 backdrop-blur-sm",
              index === 0 ? "border-cyan-500/30" : "border-white/10"
            )}
          >
            {/* Coin Logo */}
            <div 
              className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${coin.color}20` }}
            >
              {coin.logoUrl ? (
                <img 
                  src={coin.logoUrl} 
                  alt={coin.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span 
                  className="text-xs font-bold"
                  style={{ color: coin.color }}
                >
                  {coin.symbol.charAt(0)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{coin.symbol}</span>
              <span className="text-xs text-gray-400 hidden sm:inline">{coin.name}</span>
            </div>
            <span className="text-sm font-bold text-white">
              {formatPrice(coin.currentPrice)}
            </span>
            <span className={cn(
              "text-sm font-medium flex items-center gap-1",
              coin.change >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {coin.change >= 0 
                ? <TrendingUp className="w-4 h-4" /> 
                : <TrendingDown className="w-4 h-4" />
              }
              {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(1)}%
            </span>
            {index > 0 && (
              <button
                onClick={() => removeCompareCoin(coin.symbol)}
                className="ml-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Timeframe & Compare Controls */}
      <div className="flex items-center justify-between gap-3 mb-4">
        {/* Timeframe Buttons */}
        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-all duration-200',
                tf === timeframe
                  ? 'bg-white/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setChartType('area')}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                chartType === 'area'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              )}
              title="Area Chart"
            >
              <AreaChartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('candlestick')}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all',
                chartType === 'candlestick'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              )}
              title="Candlestick Chart"
              disabled={isCompareMode}
            >
              <CandlestickChart className={cn(
                "w-3.5 h-3.5",
                isCompareMode && "opacity-50"
              )} />
            </button>
          </div>

          {/* Compare Mode Indicator - Shows that percentage mode is auto-active */}
          {isCompareMode && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <span className="text-xs text-cyan-400 font-medium">% Mode</span>
            </div>
          )}

          {/* Compare Button */}
          <div className="relative">
            <button
              onClick={() => setCompareOpen(!compareOpen)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                'border border-white/20 bg-white/5 text-white',
                'hover:bg-white/10 hover:border-white/30',
                compareOpen && 'bg-white/10 border-white/30'
              )}
            >
              Compare
              {compareCoins.length > 0 && (
                <span className="bg-cyan-500 text-black rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                  {compareCoins.length}
                </span>
              )}
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform duration-200",
                compareOpen && "rotate-180"
              )} />
            </button>

            {compareOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-2 border-b border-white/10">
                  <p className="text-xs text-gray-400">Pilih hingga 3 koin</p>
                </div>
                <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                  {availableCompareOptions.map((coin) => (
                    <button
                      key={coin.symbol}
                      onClick={() => toggleCompareCoin(coin.symbol)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-colors"
                    >
                      <span className="text-sm font-medium text-white">{coin.symbol}</span>
                      <span className="text-xs text-gray-400">{coin.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compare Mode Info Banner */}
      {isCompareMode && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <p className="text-xs text-cyan-400">
            <strong>Perbandingan {allSymbols.join(' vs ')}:</strong> Menampilkan perubahan % dari titik awal periode.
          </p>
        </div>
      )}

      {/* Chart Area */}
      <div className="w-full">
        {loading && (chartData.length === 0 || (isCompareMode && normalizedChartData.length === 0)) ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Memuat data...</span>
            </div>
          </div>
        ) : error ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <button 
                onClick={fetchData}
                className="mt-2 text-xs text-cyan-400 hover:underline"
              >
                Coba lagi
              </button>
            </div>
          </div>
        ) : normalizedChartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm text-gray-400">Tidak ada data tersedia</p>
          </div>
        ) : chartType === 'candlestick' && !isCompareMode ? (
          // Realtime Candlestick Chart using TradingView embed
          <TradingViewCandlestickEmbed 
            symbol={primarySymbol}
            timeframe={timeframe}
          />
        ) : (
          // Line Chart Classic
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
              accessibilityLayer
              data={effectiveChartMode === 'percent' ? normalizedChartData : chartData}
              margin={{ left: 12, right: 12, top: 20, bottom: 12 }}
            >
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                tickFormatter={(val) => 
                  effectiveChartMode === 'percent' 
                    ? formatPercent(val) 
                    : formatPrice(val)
                }
                // NATIVE AUTO-SCALING for Price Mode
                domain={effectiveChartMode === 'percent' ? (percentDomain || ['auto', 'auto']) : ['auto', 'auto']}
                padding={{ top: 20, bottom: 20 }}
                width={70}
                allowDataOverflow={false}
              />
              {effectiveChartMode === 'percent' && (
                <ReferenceLine 
                  y={0} 
                  stroke="rgba(255,255,255,0.15)" 
                  strokeDasharray="4 4"
                />
              )}
              <ChartTooltip
                cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  
                  return (
                    <div className="bg-black/95 border border-white/20 backdrop-blur-xl rounded-xl p-3 shadow-xl">
                      <p className="text-xs text-gray-400 mb-2">{label}</p>
                      {payload.map((entry: any, index: number) => {
                        return (
                          <div key={index} className="flex items-center justify-between gap-4 py-1">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm text-gray-300">{entry.dataKey}</span>
                            </div>
                            <span className="text-sm font-semibold text-white">
                              {effectiveChartMode === 'percent' 
                                ? formatPercent(entry.value)
                                : formatPrice(entry.value)
                              }
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {coinInfos.map((coin, index) => (
                <Line
                  key={coin.symbol}
                  dataKey={coin.symbol}
                  type="monotone"
                  stroke={coin.color}
                  strokeWidth={2}
                  strokeDasharray={index > 0 ? "3 3" : undefined}
                  dot={false}
                  activeDot={{ 
                    r: 5, 
                    fill: coin.color, 
                    stroke: '#fff', 
                    strokeWidth: 2 
                  }}
                  isAnimationActive={true} 
                  animationDuration={1000}
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </div>

      {/* Comparison Analysis Summary */}
      {isCompareMode && coinInfos.length > 1 && !loading && (
        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3">
            {coinInfos.length === 2 
              ? `Ringkasan Perbandingan ${coinInfos[0].symbol} vs ${coinInfos[1].symbol}`
              : `Ringkasan Perbandingan ${coinInfos.map(c => c.symbol).join(', ')}`
            }
          </h3>
          
          <div className="space-y-2 text-sm text-gray-300">
            {/* Performance Summary */}
            <p>
              Dalam periode <strong className="text-white">{timeframe}</strong> terakhir:
            </p>
            
            <ul className="space-y-1.5 ml-4">
              {coinInfos.map((coin, index) => (
                <li key={coin.symbol} className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: coin.color }}
                  />
                  <span>
                    <strong style={{ color: coin.color }}>{coin.symbol}</strong>
                    {' '}({coin.name}) menunjukkan performa{' '}
                    <span className={coin.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
                    </span>
                    {' '}dengan harga saat ini{' '}
                    <strong className="text-white">{formatPrice(coin.currentPrice)}</strong>
                  </span>
                </li>
              ))}
            </ul>
            
            {/* Winner Analysis */}
            {coinInfos.length >= 2 && (() => {
              const sorted = [...coinInfos].sort((a, b) => b.change - a.change);
              const best = sorted[0];
              const worst = sorted[sorted.length - 1];
              const diff = Math.abs(best.change - worst.change);
              
              return (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong style={{ color: best.color }}>{best.symbol}</strong>
                      {' '}menunjukkan performa terbaik dengan{' '}
                      <span className={best.change >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {best.change >= 0 ? '+' : ''}{best.change.toFixed(2)}%
                      </span>
                      {coinInfos.length === 2 && (
                        <span>
                          , <strong className="text-white">{diff.toFixed(2)}%</strong> lebih baik dari {worst.symbol}
                        </span>
                      )}
                    </span>
                  </p>
                  
                  {best.change > 0 && worst.change < 0 && (
                    <p className="mt-2 text-xs text-gray-400">
                      Catatan: {best.symbol} bergerak positif sementara {worst.symbol} mengalami penurunan, 
                      menunjukkan divergensi performa yang signifikan dalam periode ini.
                    </p>
                  )}
                  
                  {best.change > 0 && worst.change > 0 && (
                    <p className="mt-2 text-xs text-gray-400">
                      Catatan: Kedua aset menunjukkan momentum positif dalam periode ini.
                    </p>
                  )}
                  
                  {best.change < 0 && worst.change < 0 && (
                    <p className="mt-2 text-xs text-gray-400">
                      Catatan: Kedua aset mengalami koreksi dalam periode ini, {best.symbol} lebih resilient.
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {chartType === 'candlestick' && !isCompareMode ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-400">
                Realtime • {timeframe}
              </span>
            </>
          ) : loading ? (
            <>
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs text-yellow-400">Memperbarui data...</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-400">
                Live update: {lastUpdate} • {timeframe}
              </span>
            </>
          )}
        </div>
        <span className="text-xs text-gray-500">
          Powered by {chartType === 'candlestick' && !isCompareMode ? 'TradingView' : 'CoinGecko'}
        </span>
      </div>
    </div>
  );
}
