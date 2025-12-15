// Preprocessor untuk candlestick data sebelum dikirim ke LLM
import { OHLCData, MarketDataResponse } from './data-fetcher';

export interface PreprocessedCandlestick {
  summary: {
    symbol: string;
    timeframe: string;
    totalCandles: number;
    dateRange: {
      from: string;
      to: string;
    };
    priceRange: {
      min: number;
      max: number;
      current: number;
    };
    volatility: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  statistics: {
    averagePrice: number;
    averageVolume?: number;
    priceChange: number;
    priceChangePercent: number;
    highestClose: number;
    lowestClose: number;
  };
  patterns: {
    doji: number;
    hammer: number;
    engulfing: number;
    spinning_top: number;
  };
  technicalIndicators: {
    ma20?: number;
    ma50?: number;
    rsi?: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  recentCandles: Array<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    pattern?: string;
  }>;
  formattedForLLM: string; // String yang di-format khusus untuk LLM
}

/**
 * Preprocess candlestick data untuk analisis LLM
 */
export function preprocessCandlestick(
  marketData: MarketDataResponse,
  indicators: { ma20?: number | null; rsi?: number | null; trend?: string }
): PreprocessedCandlestick {
  const { symbol, data, currentPrice, change24h } = marketData;
  
  if (data.length === 0) {
    throw new Error('No data to preprocess');
  }

  // Calculate statistics
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume || 0).filter(v => v > 0);
  const averagePrice = closes.reduce((a, b) => a + b, 0) / closes.length;
  const averageVolume = volumes.length > 0 
    ? volumes.reduce((a, b) => a + b, 0) / volumes.length 
    : undefined;
  
  const highestClose = Math.max(...closes);
  const lowestClose = Math.min(...closes);
  const priceRange = Math.max(...data.map(d => d.high)) - Math.min(...data.map(d => d.low));
  const volatility = priceRange / averagePrice; // Price volatility as percentage

  // Calculate price change
  const firstClose = closes[0];
  const lastClose = closes[closes.length - 1];
  const priceChange = lastClose - firstClose;
  const priceChangePercent = firstClose > 0 ? (priceChange / firstClose) * 100 : 0;

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (priceChangePercent > 2) trend = 'bullish';
  else if (priceChangePercent < -2) trend = 'bearish';

  // Detect candlestick patterns
  const patterns = detectCandlestickPatterns(data);

  // Get recent candles (last 10)
  const recentCandles = data.slice(-10).map((candle, index) => {
    const pattern = detectSingleCandlePattern(candle, index > 0 ? data[data.length - 11 + index] : null);
    return {
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      pattern: pattern || undefined,
    };
  });

  // Calculate MA50 if we have enough data
  const ma50 = data.length >= 50
    ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50
    : undefined;

  // Format untuk LLM (readable text format)
  const formattedForLLM = formatForLLM(
    symbol,
    data,
    {
      trend,
      volatility,
      priceChange: priceChangePercent,
      patterns,
      indicators: {
        ma20: indicators.ma20,
        ma50,
        rsi: indicators.rsi,
      },
      currentPrice: currentPrice || lastClose,
      change24h: change24h || priceChangePercent,
    }
  );

  return {
    summary: {
      symbol,
      timeframe: `${data.length} candles`,
      totalCandles: data.length,
      dateRange: {
        from: data[0].time,
        to: data[data.length - 1].time,
      },
      priceRange: {
        min: lowestClose,
        max: highestClose,
        current: currentPrice || lastClose,
      },
      volatility: Math.round(volatility * 10000) / 100, // Percentage with 2 decimals
      trend,
    },
    statistics: {
      averagePrice: Math.round(averagePrice * 100) / 100,
      averageVolume: averageVolume ? Math.round(averageVolume) : undefined,
      priceChange: Math.round(priceChange * 100) / 100,
      priceChangePercent: Math.round(priceChangePercent * 100) / 100,
      highestClose: Math.round(highestClose * 100) / 100,
      lowestClose: Math.round(lowestClose * 100) / 100,
    },
    patterns,
    technicalIndicators: {
      ma20: indicators.ma20 ? Math.round(indicators.ma20 * 100) / 100 : undefined,
      ma50: ma50 ? Math.round(ma50 * 100) / 100 : undefined,
      rsi: indicators.rsi ? Math.round(indicators.rsi * 100) / 100 : undefined,
      trend: (indicators.trend as 'bullish' | 'bearish' | 'neutral') || trend,
    },
    recentCandles,
    formattedForLLM,
  };
}

/**
 * Detect candlestick patterns in the data
 */
function detectCandlestickPatterns(data: OHLCData[]): {
  doji: number;
  hammer: number;
  engulfing: number;
  spinning_top: number;
} {
  let doji = 0;
  let hammer = 0;
  let engulfing = 0;
  let spinning_top = 0;

  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];
    
    const body = Math.abs(current.close - current.open);
    const totalRange = current.high - current.low;
    const upperWick = current.high - Math.max(current.open, current.close);
    const lowerWick = Math.min(current.open, current.close) - current.low;

    // Doji: very small body
    if (totalRange > 0 && body / totalRange < 0.1) {
      doji++;
    }

    // Hammer: small body at top, long lower wick
    if (body / totalRange < 0.3 && lowerWick > body * 2 && upperWick < body) {
      hammer++;
    }

    // Engulfing: current candle engulfs previous
    const prevBody = Math.abs(previous.close - previous.open);
    if (body > prevBody * 1.5) {
      if ((current.open < previous.close && current.close > previous.open) ||
          (current.open > previous.close && current.close < previous.open)) {
        engulfing++;
      }
    }

    // Spinning top: small body, long wicks on both sides
    if (body / totalRange < 0.3 && upperWick > body && lowerWick > body) {
      spinning_top++;
    }
  }

  return { doji, hammer, engulfing, spinning_top };
}

/**
 * Detect pattern for a single candle
 */
function detectSingleCandlePattern(
  candle: OHLCData,
  previous: OHLCData | null
): string | null {
  const body = Math.abs(candle.close - candle.open);
  const totalRange = candle.high - candle.low;
  if (totalRange === 0) return null;

  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const isBullish = candle.close > candle.open;

  // Doji
  if (body / totalRange < 0.1) {
    return 'Doji';
  }

  // Hammer
  if (body / totalRange < 0.3 && lowerWick > body * 2 && upperWick < body) {
    return isBullish ? 'Hammer (Bullish)' : 'Inverted Hammer';
  }

  // Shooting Star
  if (body / totalRange < 0.3 && upperWick > body * 2 && lowerWick < body) {
    return isBullish ? 'Shooting Star' : 'Inverted Hammer';
  }

  // Spinning Top
  if (body / totalRange < 0.3 && upperWick > body && lowerWick > body) {
    return 'Spinning Top';
  }

  // Engulfing (needs previous candle)
  if (previous) {
    const prevBody = Math.abs(previous.close - previous.open);
    if (body > prevBody * 1.5) {
      const isBullishEngulfing = previous.close < previous.open && candle.open < previous.close && candle.close > previous.open;
      const isBearishEngulfing = previous.close > previous.open && candle.open > previous.close && candle.close < previous.open;
      
      if (isBullishEngulfing) return 'Bullish Engulfing';
      if (isBearishEngulfing) return 'Bearish Engulfing';
    }
  }

  return null;
}

/**
 * Format data untuk LLM analysis (readable text format)
 */
function formatForLLM(
  symbol: string,
  data: OHLCData[],
  analysis: {
    trend: string;
    volatility: number;
    priceChange: number;
    patterns: { doji: number; hammer: number; engulfing: number; spinning_top: number };
    indicators: { ma20?: number | null; ma50?: number | null; rsi?: number | null };
    currentPrice: number;
    change24h: number;
  }
): string {
  const lastCandle = data[data.length - 1];
  const firstCandle = data[0];
  
  return `CANDLESTICK ANALYSIS FOR ${symbol.toUpperCase()}

TIME RANGE:
- From: ${new Date(firstCandle.time).toLocaleDateString()}
- To: ${new Date(lastCandle.time).toLocaleDateString()}
- Total Candles: ${data.length}

PRICE INFORMATION:
- Current Price: $${analysis.currentPrice.toFixed(2)}
- Price Change: ${analysis.priceChange >= 0 ? '+' : ''}${analysis.priceChange.toFixed(2)}%
- 24h Change: ${analysis.change24h >= 0 ? '+' : ''}${analysis.change24h.toFixed(2)}%
- Price Range: $${Math.min(...data.map(d => d.low)).toFixed(2)} - $${Math.max(...data.map(d => d.high)).toFixed(2)}
- Volatility: ${analysis.volatility.toFixed(2)}%

TREND ANALYSIS:
- Overall Trend: ${analysis.trend.toUpperCase()}
- Moving Average 20: ${analysis.indicators.ma20 ? `$${analysis.indicators.ma20.toFixed(2)}` : 'N/A'}
- Moving Average 50: ${analysis.indicators.ma50 ? `$${analysis.indicators.ma50.toFixed(2)}` : 'N/A'}
- RSI: ${analysis.indicators.rsi ? analysis.indicators.rsi.toFixed(2) : 'N/A'}

CANDLESTICK PATTERNS DETECTED:
- Doji: ${analysis.patterns.doji}
- Hammer: ${analysis.patterns.hammer}
- Engulfing: ${analysis.patterns.engulfing}
- Spinning Top: ${analysis.patterns.spinning_top}

RECENT CANDLES (Last 5):
${data.slice(-5).map((c, i) => {
  const pattern = detectSingleCandlePattern(c, i > 0 ? data[data.length - 6 + i] : null);
  return `${i + 1}. ${new Date(c.time).toLocaleDateString()} - O:$${c.open.toFixed(2)} H:$${c.high.toFixed(2)} L:$${c.low.toFixed(2)} C:$${c.close.toFixed(2)} ${pattern ? `[${pattern}]` : ''}`;
}).join('\n')}

LATEST CANDLE DETAILS:
- Open: $${lastCandle.open.toFixed(2)}
- High: $${lastCandle.high.toFixed(2)}
- Low: $${lastCandle.low.toFixed(2)}
- Close: $${lastCandle.close.toFixed(2)}
- Volume: ${lastCandle.volume ? lastCandle.volume.toLocaleString() : 'N/A'}
`;
}
