// Service untuk fetch data saham & kripto
// 
// CRYPTO: HANYA menggunakan CoinGecko API (gratis, no API key needed untuk basic)
//         - SATU-SATUNYA source untuk data crypto OHLC
//         - TIDAK menggunakan sumber lain
//         - Endpoint: https://api.coingecko.com/api/v3/coins/{id}/ohlc
// 
// STOCK: Menggunakan Yahoo Finance API
//        - Endpoint: https://query1.finance.yahoo.com/v8/finance/chart/{symbol}
//        - Support saham US dan Indonesia (IDX)
//        - Saham Indonesia menggunakan format: {SYMBOL}.JK (contoh: BBCA.JK, BBRI.JK)
//        - Sistem otomatis menambahkan .JK untuk saham Indonesia yang dikenal
//        - Alternatif: Polygon.io API (jika POLYGON_API_KEY tersedia, untuk saham US saja)

import axios from 'axios';
import { cachedFetch } from '@/lib/market/coingecko-cache';
import { cachedStockFetch } from '@/lib/market/stock-cache';

export interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketDataResponse {
  symbol: string;
  data: OHLCData[];
  currentPrice?: number;
  change24h?: number;
  logoUrl?: string; // Logo URL langsung dari API atau sumber eksternal
  companyName?: string; // Nama perusahaan
}

// Fetch kripto data - HANYA menggunakan CoinGecko API
export async function fetchCryptoData(
  symbol: string,
  days: number = 7
): Promise<MarketDataResponse> {
  try {
    // Normalize symbol (BTC -> bitcoin, ETH -> ethereum)
    const coinId = normalizeCryptoSymbol(symbol);
    
    // CoinGecko API untuk OHLC data
    // IMPORTANT: Ini adalah SATU-SATUNYA source untuk crypto data
    // TIDAK menggunakan API lain untuk crypto
    // IMPORTANT: CoinGecko Free Tier interval adalah AUTO berdasarkan days parameter:
    // - days=1-2: 30-minute intervals (~48-96 data points)
    // - days=3-30: 4-hour intervals (~18-180 data points) 
    // - days=31+: 4-day intervals (SANGAT SEDIKIT - ~8-23 data points untuk 30-90 days!)
    // 
    // Untuk mendapatkan lebih banyak data points, kita bisa:
    // 1. Request multiple smaller ranges dan combine (untuk days > 30)
    // 2. Atau gunakan paid API dengan interval parameter
    //
    // Current implementation: menggunakan days langsung (CoinGecko auto-select interval)
    // 
    // NOTE: CoinGecko has a maximum of 365 days for free tier
    // For MAX timeframe (3650 days), we'll cap at 365 days
    const maxDays = Math.min(days, 365);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${maxDays}`;
    
    console.log(`📡 [Crypto Data] Fetching from CoinGecko: ${coinId}, days: ${days} (capped at ${maxDays} for API limit)`);
    console.log(`📊 [Crypto Data] Expected data points: ${maxDays <= 2 ? `${maxDays * 24} hourly` : maxDays <= 30 ? `${Math.ceil(maxDays * 6)} 4-hourly` : `${Math.ceil(maxDays / 4)} daily`}`);
    
    let response;
    try {
      const cacheKey = `cg:ohlc:${coinId}:${maxDays}`;
      const { value: ohlcData } = await cachedFetch(
        cacheKey,
        {
          ttlMs: 60_000,
          staleMs: 600_000,
          isRateLimitError: (err) => err?.response?.status === 429,
        },
        async () => {
          const res = await axios.get(url, {
            timeout: 15000, // Increase timeout
            headers: {
              Accept: 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
            },
          });
          return res.data;
        }
      );

      response = { status: 200, data: ohlcData } as any;
      console.log(`✅ [Crypto Data] CoinGecko response received: ${response.status}, raw data points: ${Array.isArray(response.data) ? response.data.length : 0}`);
    } catch (axiosError: any) {
      console.error(`❌ [Crypto Data] CoinGecko fetch failed for ${symbol}:`, {
        message: axiosError.message,
        code: axiosError.code,
        response: axiosError.response?.status,
      });
      
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        throw new Error(`CoinGecko API timeout. Coba lagi beberapa saat.`);
      } else if (axiosError.response?.status === 404) {
        throw new Error(`Kripto ${symbol} tidak ditemukan di CoinGecko.`);
      } else if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        throw new Error(`Tidak dapat terhubung ke CoinGecko API. Cek koneksi internet.`);
      } else if (axiosError.response?.status === 429) {
        // Rate limit - try to get retry-after header
        const retryAfter = axiosError.response?.headers?.['retry-after'] || '60';
        throw new Error(`Rate limit CoinGecko (429). Coba lagi dalam ${retryAfter} detik. Untuk comparison, sistem akan menunggu antar request.`);
        throw new Error(`Rate limit CoinGecko (429). Coba lagi beberapa saat.`);
      } else {
        throw new Error(`CoinGecko API error: ${axiosError.message}`);
      }
    }

    // CoinGecko returns: [timestamp, open, high, low, close]
    const ohlcData = response.data as Array<[number, number, number, number, number]>;
    
    // Filter and validate data, then sort by time
    const data: OHLCData[] = ohlcData
      .filter(([timestamp, open, high, low, close]) => {
        // Validate data
        return timestamp && 
               !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close) &&
               open > 0 && high > 0 && low > 0 && close > 0 &&
               high >= low && high >= Math.max(open, close) && low <= Math.min(open, close);
      })
      .map(([timestamp, open, high, low, close]) => ({
        time: new Date(timestamp).toISOString(),
        open,
        high,
        low,
        close,
      }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()); // Sort ascending

    if (data.length === 0) {
      throw new Error(`No valid data points after filtering for ${symbol}. Raw data: ${ohlcData.length} points`);
    }

    console.log(`✅ [Crypto Data] Valid OHLC data points after filtering: ${data.length} (filtered out: ${ohlcData.length - data.length})`);

    // Get current price and 24h change
    const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`;
    const { value: priceJson } = await cachedFetch(
      `cg:simple_price:${coinId}:usd`,
      {
        ttlMs: 15_000,
        staleMs: 120_000,
        isRateLimitError: (err) => err?.response?.status === 429,
      },
      async () => {
        const priceResponse = await axios.get(priceUrl, {
          timeout: 10000,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
        return priceResponse.data;
      }
    );

    const priceData = priceJson[coinId];
    
    // Get logo and name from CoinGecko coin metadata (direct URL from browser)
    let logoUrl: string | undefined;
    let companyName: string | undefined;
    try {
      const coinUrl = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
      const { value: coinJson } = await cachedFetch(
        `cg:coin:${coinId}`,
        {
          ttlMs: 300_000, // 5 minutes
          staleMs: 3_600_000, // 1 hour
          isRateLimitError: (err) => err?.response?.status === 429,
        },
        async () => {
          const coinResponse = await axios.get(coinUrl, {
            timeout: 10000,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
          return coinResponse.data;
        }
      );
      
      if (coinJson) {
        // Prefer large image, fallback to small or thumb
        logoUrl = coinJson.image?.large || coinJson.image?.small || coinJson.image?.thumb;
        companyName = coinJson.name;
        console.log(`✅ [Crypto Data] Logo URL from CoinGecko for ${symbol}:`, logoUrl);
      }
    } catch (error: any) {
      console.log(`⚠️ [Crypto Data] Could not fetch logo from CoinGecko for ${symbol}, will use fallback`);
    }
    
    return {
      symbol: symbol.toUpperCase(),
      data,
      currentPrice: priceData?.usd,
      change24h: priceData?.usd_24h_change,
      logoUrl, // Logo URL langsung dari CoinGecko - bisa digunakan langsung di browser
      companyName, // Nama coin dari CoinGecko
    };
  } catch (error: any) {
    console.error(`Error fetching crypto data for ${symbol}:`, error.message);
    // Strict: Only real-time data, no sample data fallback
    throw new Error(`Failed to fetch real-time crypto data for ${symbol}: ${error.message}`);
  }
}

// Normalize crypto symbol ke CoinGecko ID
function normalizeCryptoSymbol(symbol: string): string {
  // Validate symbol is a string
  if (!symbol || typeof symbol !== 'string') {
    console.error('❌ [Normalize Crypto Symbol] Invalid symbol:', symbol, typeof symbol);
    throw new Error(`Invalid symbol format: expected string, got ${typeof symbol}`);
  }
  
  const mapping: Record<string, string> = {
    'btc': 'bitcoin',
    'eth': 'ethereum',
    'bnb': 'binancecoin',
    'sol': 'solana',
    'ada': 'cardano',
    'xrp': 'ripple',
    'dot': 'polkadot',
    'matic': 'matic-network',
    'avax': 'avalanche-2',
    'doge': 'dogecoin',
    'ltc': 'litecoin',
    'link': 'chainlink',
    'atom': 'cosmos',
    'etc': 'ethereum-classic',
    'xlm': 'stellar',
    'algo': 'algorand',
    'vet': 'vechain',
    'icp': 'internet-computer',
    'trx': 'tron',
  };

  const normalized = symbol.toLowerCase();
  return mapping[normalized] || normalized;
}

// Sample data functions removed - only real-time data from APIs is used

// Normalize stock symbol untuk Yahoo Finance (tambahkan exchange suffix jika perlu)
function normalizeStockSymbol(symbol: string): string {
  // Validate symbol is a string
  if (!symbol || typeof symbol !== 'string') {
    console.error('❌ [Normalize Stock Symbol] Invalid symbol:', symbol, typeof symbol);
    throw new Error(`Invalid symbol format: expected string, got ${typeof symbol}`);
  }
  
  let symbolUpper = symbol.toUpperCase();
  
  // Map BCA to BBCA (Bank Central Asia)
  if (symbolUpper === 'BCA') {
    symbolUpper = 'BBCA';
  }
  
  // Indonesian stocks need .JK suffix
  // Extended list of Indonesian stocks (IDX)
  const indonesianStocks = [
    // Banks
    'GOTO', 'BBRI', 'BBCA', 'BBNI', 'BMRI', 'BNGA', 'BJBR', 'BTPN', 'BNII',
    // Telecommunications
    'TLKM', 'EXCL', 'ISAT',
    // Consumer Goods
    'ASII', 'UNVR', 'ICBP', 'INDF', 'MYOR', 'ROTI', 'ULTJ',
    // Energy
    'PGAS', 'PTBA', 'ADRO', 'MEDC', 'BUMI',
    // Infrastructure
    'JSMR', 'WIKA', 'WEGE', 'ADHI',
    // Property
    'BSDE', 'CTRA', 'DMAS',
    // Mining
    'ANTM', 'INCO', 'PTBA',
    // Others
    'KLBF', 'GGRM', 'SMGR', 'INTP', 'TKIM', 'CPIN', 'SRIL', 'AKRA'
  ];
  if (indonesianStocks.includes(symbolUpper) && !symbolUpper.includes('.')) {
    return `${symbolUpper}.JK`;
  }
  
  // Also handle if user already typed .JK
  if (symbolUpper.endsWith('.JK')) {
    return symbolUpper;
  }
  
  // Jika sudah ada suffix, return as is
  if (symbolUpper.includes('.')) {
    return symbolUpper;
  }
  
  return symbolUpper;
}

// Fetch stock data using Yahoo Finance API (free, no API key needed)
export async function fetchStockData(
  symbol: string,
  days: number = 7
): Promise<MarketDataResponse> {
  // Validate symbol is a string
  if (!symbol || typeof symbol !== 'string') {
    throw new Error(`Invalid symbol format: expected string, got ${typeof symbol}`);
  }
  
  const normalizedSymbol = normalizeStockSymbol(symbol);

  // If Polygon API key exists, try Polygon first for US stocks.
  // For non-US tickers (e.g., Indonesian stocks with .JK), Polygon US endpoint won't work → fallback to Yahoo.
  if (process.env.POLYGON_API_KEY) {
    const looksLikeIndo = normalizedSymbol.toUpperCase().endsWith('.JK');
    if (!looksLikeIndo) {
      try {
        return await fetchStockDataPolygon(normalizedSymbol, days);
      } catch (e: any) {
        const msg = String(e?.message || '');
        console.warn(`⚠️ [Stock Data] Polygon failed for ${normalizedSymbol}, falling back to Yahoo:`, msg);
        // Continue to Yahoo fallback below
      }
    }
  }
  
  try {
    // Yahoo Finance API endpoint (public, no auth required)
    // IMPORTANT: Interval dan Range harus compatible untuk mendapatkan lebih banyak data points:
    // - interval=5m works with range: 1d (intraday data - ~288 points per day)
    // - interval=1h works with range: 1d, 5d, 7d, 1mo (hourly data - ~24-730 points)
    // - interval=1d works with range: 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    //
    // Strategy: Gunakan interval lebih kecil untuk periode pendek agar dapat lebih banyak data points
    let interval = '1d'; // Default: daily
    let period: string;
    
    // Map days to Yahoo Finance period format
    if (days <= 5) {
      period = '5d';
    } else if (days <= 30) {
      period = '1mo';
    } else if (days <= 90) {
      period = '3mo';
    } else if (days <= 180) {
      period = '6mo';
    } else if (days <= 365) {
      period = '1y';
    } else if (days <= 730) {
      period = '2y';
    } else if (days <= 1825) {
      period = '5y';
    } else {
      period = '10y'; // For MAX timeframe (3650 days), use 10y
    }
    
    // Optimize interval untuk lebih banyak data points
    if (days === 1) {
      // 1 day: use 5-minute intervals for intraday (288 data points)
      interval = '5m';
      period = '1d';
      console.log(`📊 [Stock Data] Strategy: 1 day → 5m interval = ~288 data points`);
    } else if (days <= 7 && days > 1) {
      // 2-7 days: use hourly intervals (48-168 data points vs 2-7 for daily)
      interval = '1h';
      period = '7d';
      console.log(`📊 [Stock Data] Strategy: ${days} days → 1h interval = ~${days * 24} data points`);
    } else {
      // 8+ days: use daily intervals (standard)
      console.log(`📊 [Stock Data] Strategy: ${days} days → 1d interval = ~${days} data points`);
    }
    
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}?interval=${interval}&range=${period}`;
    const cacheKey = `stock:${normalizedSymbol}:${days}:${interval}:${period}`;
    
    console.log(`📡 [Stock Data] Fetching from Yahoo Finance: ${normalizedSymbol} (original: ${symbol}), interval: ${interval}, period: ${period}`);
    
    // ✅ CACHE INTEGRATION: Use cache to reduce API calls (60s fresh, 300s stale)
    const { cachedStockFetch } = await import('@/lib/market/stock-cache');
    let response;
    try {
      const cachedResult = await cachedStockFetch(cacheKey, async () => {
        const res = await axios.get(url, {
          timeout: 30000, // 30s timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
        return res;
      });
      
      response = cachedResult.value;
      
      // Log cache status
      if (cachedResult.state === 'hit') {
        console.log(`💾 [Stock Data] Cache HIT for ${normalizedSymbol}`);
      } else if (cachedResult.state === 'stale') {
        console.log(`⚠️ [Stock Data] Cache STALE for ${normalizedSymbol} (serving anyway)`);
      } else {
        console.log(`🔄 [Stock Data] Cache MISS for ${normalizedSymbol} (fresh fetch)`);
      }
      
      console.log(`✅ [Stock Data] Yahoo Finance response received: ${response.status}`);
    } catch (axiosError: any) {
      console.error(`❌ [Stock Data] Yahoo Finance fetch failed for ${symbol}:`, {
        message: axiosError.message,
        code: axiosError.code,
        response: axiosError.response?.status,
      });
      
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        throw new Error(`Yahoo Finance API timeout. Koneksi internet mungkin lambat atau API sedang sibuk.`);
      } else if (axiosError.response?.status === 404) {
        throw new Error(`Symbol ${symbol} tidak ditemukan di Yahoo Finance. Pastikan simbol saham benar. Untuk saham Indonesia, pastikan menggunakan format yang benar (contoh: GOTO.JK).`);
      } else if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        throw new Error(`Tidak dapat terhubung ke Yahoo Finance API. Cek koneksi internet.`);
      } else {
        throw new Error(`Yahoo Finance API error: ${axiosError.message}`);
      }
    }

    if (!response.data || !response.data.chart || !response.data.chart.result) {
      throw new Error('Invalid response from Yahoo Finance');
    }

    const result = response.data.chart.result[0];
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    // Filter and validate data, then sort by time
    const data: OHLCData[] = timestamps
      .map((timestamp: number, index: number) => {
        const open = quote.open[index] || 0;
        const high = quote.high[index] || 0;
        const low = quote.low[index] || 0;
        const close = quote.close[index] || 0;
        
        // Validate OHLC data
        if (!timestamp || !open || !high || !low || !close ||
            high < low || high < Math.max(open, close) || low > Math.min(open, close)) {
          return null;
        }
        
        return {
          time: new Date(timestamp * 1000).toISOString(),
          open,
          high,
          low,
          close,
          volume: quote.volume[index] || 0,
        };
      })
      .filter((item: OHLCData | null): item is OHLCData => item !== null)
      .sort((a: OHLCData, b: OHLCData) => new Date(a.time).getTime() - new Date(b.time).getTime()); // Sort ascending

    if (data.length === 0) {
      throw new Error(`No valid data points after filtering for ${symbol}. Raw timestamps: ${timestamps.length}`);
    }

    console.log(`✅ [Stock Data] Valid OHLC data points after filtering: ${data.length} (filtered out: ${timestamps.length - data.length})`);

    // Get current price
    const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
    const prevClose = data.length > 1 ? data[data.length - 2].close : currentPrice;
    const change24h = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

    // Get logo and company name from Yahoo Finance quoteSummary (direct URL from browser)
    let logoUrl: string | undefined;
    let companyName: string | undefined;
    try {
      const quoteSummaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${normalizedSymbol}?modules=assetProfile`;
      const quoteRes = await axios.get(quoteSummaryUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });
      
      const assetProfile = quoteRes.data?.quoteSummary?.result?.[0]?.assetProfile;
      if (assetProfile) {
        logoUrl = assetProfile.logoUrl; // Direct URL from Yahoo Finance - can be used in browser
        companyName = assetProfile.name || assetProfile.longName;
        console.log(`✅ [Stock Data] Logo URL from Yahoo Finance for ${symbol}:`, logoUrl);
      }
    } catch (error: any) {
      console.log(`⚠️ [Stock Data] Could not fetch logo from Yahoo Finance for ${symbol}, will use fallback`);
    }

    // If no logo from Yahoo Finance, use fallback mapping
    if (!logoUrl) {
      const ticker = symbol.toUpperCase().replace('.JK', '');
      const domainMap: Record<string, string> = {
        BBCA: 'bca.co.id', BBRI: 'bri.co.id', BMRI: 'bankmandiri.co.id',
        BBNI: 'bni.co.id', TLKM: 'telkom.co.id', ASII: 'astra.co.id',
        GOTO: 'goto.com', UNVR: 'unilever.co.id', ICBP: 'icbpfood.com',
        INDF: 'indofood.com', PGAS: 'pertamina.com', AAPL: 'apple.com',
        MSFT: 'microsoft.com', TSLA: 'tesla.com', GOOGL: 'google.com',
        AMZN: 'amazon.com', META: 'meta.com', NVDA: 'nvidia.com',
      };
      const domain = domainMap[ticker];
      if (domain) {
        logoUrl = `https://logo.clearbit.com/${domain}`; // Direct URL from browser
        console.log(`✅ [Stock Data] Using Clearbit logo for ${symbol}:`, logoUrl);
      } else {
        // Try IEX as last resort
        logoUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${ticker}.png`; // Direct URL from browser
        console.log(`✅ [Stock Data] Using IEX logo for ${symbol}:`, logoUrl);
      }
    }

    return {
      symbol: symbol.toUpperCase().replace('.JK', ''), // Return original symbol without exchange suffix
      data,
      currentPrice,
      change24h,
      logoUrl, // Logo URL langsung dari API - bisa digunakan langsung di browser
      companyName, // Nama perusahaan dari API
    };
  } catch (error: any) {
    console.error(`Error fetching stock data for ${symbol}:`, error.message);
    // Strict: Only real-time data, no sample data fallback
    throw new Error(`Failed to fetch real-time stock data for ${symbol}: ${error.message}`);
  }
}

async function fetchStockDataPolygon(
  normalizedSymbol: string,
  days: number
): Promise<MarketDataResponse> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  const ticker = normalizedSymbol.toUpperCase().replace('.JK', '');

  // Choose granularity based on range
  let timespan: 'minute' | 'hour' | 'day' = 'day';
  let multiplier = 1;

  if (days <= 1) {
    timespan = 'minute';
    multiplier = 1; // 1-min candles
  } else if (days <= 7) {
    timespan = 'minute';
    multiplier = 5; // 5-min candles
  } else if (days <= 30) {
    timespan = 'hour';
    multiplier = 1; // hourly candles
  } else {
    timespan = 'day';
    multiplier = 1;
  }

  const now = new Date();
  const fromDate = new Date(now.getTime() - Math.max(days, 1) * 24 * 60 * 60 * 1000);
  const from = fromDate.toISOString().slice(0, 10); // YYYY-MM-DD
  const to = now.toISOString().slice(0, 10);

  const url =
    `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${multiplier}/${timespan}` +
    `/${encodeURIComponent(from)}/${encodeURIComponent(to)}?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(apiKey)}`;

  console.log(`📡 [Stock Data] Fetching from Polygon: ${ticker}, ${days} days, ${multiplier} ${timespan}, ${from} -> ${to}`);

  const cacheKey = `poly:aggs:${ticker}:${multiplier}:${timespan}:${from}:${to}`;
  const { value: aggJson } = await cachedFetch(
    cacheKey,
    {
      ttlMs: 60_000,
      staleMs: 600_000,
      isRateLimitError: (err) => err?.response?.status === 429,
    },
    async () => {
      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
      return res.data;
    }
  );

  // Polygon responses can vary by plan; rely on results presence.
  if (!aggJson || !Array.isArray(aggJson.results)) {
    const status = aggJson?.status;
    const err = aggJson?.error || aggJson?.message;
    throw new Error(`Invalid response from Polygon for ${ticker}${status ? ` (status: ${status})` : ''}${err ? `: ${err}` : ''}`);
  }

  const results = aggJson.results as Array<{ t: number; o: number; h: number; l: number; c: number; v?: number }>;

  const data: OHLCData[] = results
    .filter((r) => r && r.t && r.o && r.h && r.l && r.c)
    .map((r) => ({
      time: new Date(r.t).toISOString(),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: typeof r.v === 'number' ? r.v : 0,
    }))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (!data.length) {
    throw new Error(`No valid data points from Polygon for ${ticker}`);
  }

  const currentPrice = data[data.length - 1].close;
  const prevClose = data.length > 1 ? data[data.length - 2].close : currentPrice;
  const change24h = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

  return {
    symbol: ticker,
    data,
    currentPrice,
    change24h,
  };
}

// Sample data functions removed - only real-time data from APIs is used

// Calculate technical indicators
export function calculateIndicators(data: OHLCData[]) {
  if (data.length < 20) {
    return {
      ma20: null,
      rsi: null,
      trend: 'neutral',
    };
  }

  // Simple Moving Average 20
  const closes = data.map(d => d.close);
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;

  // Simple RSI calculation
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }

  const avgGain = gains.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const avgLoss = losses.slice(-14).reduce((a, b) => a + b, 0) / 14;
  const rs = avgGain / (avgLoss || 1);
  const rsi = 100 - (100 / (1 + rs));

  // Determine trend
  const currentPrice = closes[closes.length - 1];
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  
  if (currentPrice > ma20 && rsi > 50) {
    trend = 'bullish';
  } else if (currentPrice < ma20 && rsi < 50) {
    trend = 'bearish';
  }

  return {
    ma20: Math.round(ma20 * 100) / 100,
    rsi: Math.round(rsi * 100) / 100,
    trend,
  };
}
