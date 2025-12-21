'use client';

import { useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';

interface TradingViewWidgetProps {
  symbol: string;
  assetType?: 'crypto' | 'stock';
  theme?: 'dark' | 'light';
  className?: string;
  height?: number;
  showToolbar?: boolean;
  interval?: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M';
}

// Map common crypto symbols to TradingView format
const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  btc: 'BINANCE:BTCUSDT',
  eth: 'BINANCE:ETHUSDT',
  bnb: 'BINANCE:BNBUSDT',
  sol: 'BINANCE:SOLUSDT',
  ada: 'BINANCE:ADAUSDT',
  xrp: 'BINANCE:XRPUSDT',
  dot: 'BINANCE:DOTUSDT',
  matic: 'BINANCE:MATICUSDT',
  avax: 'BINANCE:AVAXUSDT',
  doge: 'BINANCE:DOGEUSDT',
  ltc: 'BINANCE:LTCUSDT',
  link: 'BINANCE:LINKUSDT',
  atom: 'BINANCE:ATOMUSDT',
  trx: 'BINANCE:TRXUSDT',
  near: 'BINANCE:NEARUSDT',
  apt: 'BINANCE:APTUSDT',
  arb: 'BINANCE:ARBUSDT',
  op: 'BINANCE:OPUSDT',
  // Add more as needed
};

// Map Indonesian stock symbols
const IDX_SYMBOL_MAP: Record<string, string> = {
  bbca: 'IDX:BBCA',
  bbri: 'IDX:BBRI',
  bmri: 'IDX:BMRI',
  bbni: 'IDX:BBNI',
  tlkm: 'IDX:TLKM',
  asii: 'IDX:ASII',
  goto: 'IDX:GOTO',
  unvr: 'IDX:UNVR',
  icbp: 'IDX:ICBP',
  indf: 'IDX:INDF',
  pgas: 'IDX:PGAS',
  // Add more as needed
};

// Map US stock symbols
const US_SYMBOL_MAP: Record<string, string> = {
  aapl: 'NASDAQ:AAPL',
  msft: 'NASDAQ:MSFT',
  googl: 'NASDAQ:GOOGL',
  amzn: 'NASDAQ:AMZN',
  tsla: 'NASDAQ:TSLA',
  nvda: 'NASDAQ:NVDA',
  meta: 'NASDAQ:META',
  nflx: 'NASDAQ:NFLX',
  // Add more as needed
};

function getTradingViewSymbol(symbol: string, assetType: 'crypto' | 'stock' = 'crypto'): string {
  const normalized = symbol.toLowerCase().replace('.jk', '').replace(/usdt$/, '');
  
  if (assetType === 'crypto') {
    return CRYPTO_SYMBOL_MAP[normalized] || `BINANCE:${symbol.toUpperCase()}USDT`;
  }
  
  // Check if Indonesian stock
  if (IDX_SYMBOL_MAP[normalized]) {
    return IDX_SYMBOL_MAP[normalized];
  }
  
  // Check if US stock
  if (US_SYMBOL_MAP[normalized]) {
    return US_SYMBOL_MAP[normalized];
  }
  
  // Default: assume NASDAQ for unknown stocks
  return `NASDAQ:${symbol.toUpperCase()}`;
}

/**
 * TradingViewWidget - Embedded TradingView chart with realtime data
 * 
 * This uses TradingView's free widget that provides:
 * - Real-time price updates
 * - Professional candlestick charts
 * - Multiple timeframes
 * - Technical analysis tools
 */
function TradingViewWidget({
  symbol,
  assetType = 'crypto',
  theme = 'dark',
  className = '',
  height = 500,
  showToolbar = true,
  interval = 'D',
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  const tradingViewSymbol = getTradingViewSymbol(symbol, assetType);

  useEffect(() => {
    // Clean up previous widget
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = `${height}px`;
    widgetContainer.style.width = '100%';
    
    if (containerRef.current) {
      containerRef.current.appendChild(widgetContainer);
    }

    // Create and load the script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tradingViewSymbol,
      interval: interval,
      timezone: 'Asia/Jakarta',
      theme: theme,
      style: '1', // Candlestick
      locale: 'id',
      enable_publishing: false,
      allow_symbol_change: true,
      hide_top_toolbar: !showToolbar,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 1)',
      gridColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      studies: [],
      withdateranges: true,
      container_id: 'tradingview_widget',
    });

    if (containerRef.current) {
      containerRef.current.appendChild(script);
      scriptRef.current = script;
    }

    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, [tradingViewSymbol, theme, height, showToolbar, interval]);

  return (
    <div 
      className={cn(
        "tradingview-widget-container rounded-xl overflow-hidden border border-blue-500/20",
        "bg-gradient-to-br from-black/80 via-black/60 to-black/80",
        className
      )}
      style={{ minHeight: `${height}px` }}
    >
      <div ref={containerRef} style={{ height: `${height}px`, width: '100%' }} />
      
      {/* Footer attribution */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-blue-500/10 bg-black/40">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Live Realtime</span>
        </div>
        <span className="text-xs text-gray-500">Powered by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
