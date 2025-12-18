'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, BarChart3, Camera, X, TrendingUp, TrendingDown, ZoomIn, ZoomOut, Download, Briefcase, MessageCircle, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Brush, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { timeframeToDays } from '@/lib/market/timeframe-utils';

export interface AssetInfo {
  symbol: string;
  name?: string;
  logo?: string;
  exchange?: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  timestamp?: string;
  color?: string;
  rsi?: number;
  trend?: string;
  market?: string;
  currency?: string;
  engine?: {
    condition: string;
    confidence: number;
    stopLoss?: number | null;
    invalidation?: number | null;
  };
}

export interface ComparisonWidgetProps {
  assets: AssetInfo[];
  chartData: Array<Record<string, any>>;
  xKey: string;
  yKeys: string[];
  timeframe?: string;
  assetType?: 'crypto' | 'stock';
  onTimeframeChange?: (timeframe: string, symbols: string[]) => Promise<void>;
  onPersonaChange?: (persona: 'investor' | 'trader' | 'education') => Promise<void>;
  onRemoveAsset?: (symbol: string) => void;
  onChartTypeChange?: (type: 'line' | 'area' | 'candlestick') => void;
  isAnalyzing?: boolean;
  narrative?: string;
}

const TIMEFRAMES = ['1D', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'];


// Default colors for assets
const ASSET_COLORS = [
  '#f97316', // orange
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#ec4899', // pink
  '#22d3ee', // light cyan
  '#8b5cf6', // violet
];

export default function ComparisonWidget({
  assets,
  chartData,
  xKey,
  yKeys,
  timeframe = '1D',
  assetType = 'stock',
  onTimeframeChange,
  onPersonaChange,
  onRemoveAsset,
  onChartTypeChange,
  isAnalyzing = false,
  narrative,
}: ComparisonWidgetProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [assetLogos, setAssetLogos] = useState<Record<string, string>>({});
  const [assetNames, setAssetNames] = useState<Record<string, string>>({});
  const [isLoadingTimeframe, setIsLoadingTimeframe] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area' | 'candlestick'>('line');
  const [userPersona, setUserPersona] = useState<'investor' | 'trader' | 'education'>('investor');
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Update selected timeframe when prop changes
  useEffect(() => {
    setSelectedTimeframe(timeframe);
  }, [timeframe]);

  // Fetch logos for all assets with verification
  useEffect(() => {
    const fetchLogos = async () => {
      const logoMap: Record<string, string> = {};
      const nameMap: Record<string, string> = {};
      
      console.log(`📊 [ComparisonWidget] Fetching logos for ${assets.length} assets (type: ${assetType})`);
      
      for (const asset of assets) {
        // Always fetch logo from API, even if asset.logo exists (to ensure it's up to date)
        let logoFromAsset = false;
        
        if (asset.logo) {
          // Verify existing logo URL first
          const img = new Image();
          const logoVerified = await new Promise<boolean>((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = asset.logo!;
            // Timeout after 3 seconds
            setTimeout(() => resolve(false), 3000);
          });
          
          if (logoVerified) {
            logoMap[asset.symbol] = asset.logo;
            logoFromAsset = true;
            console.log(`✅ [ComparisonWidget] Using existing logo for ${asset.symbol}:`, asset.logo);
          } else {
            console.warn(`⚠️ [ComparisonWidget] Existing logo invalid for ${asset.symbol}, fetching new one...`);
          }
          
          if (asset.name) nameMap[asset.symbol] = asset.name;
        }
        
        // If logo not set from asset, fetch from API
        if (!logoFromAsset) {
          try {
            // For crypto, get logo directly from CoinGecko meta (more reliable)
            if (assetType === 'crypto') {
              try {
                const metaRes = await fetch('/api/coingecko/meta', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ symbol: asset.symbol }),
                });
                if (metaRes.ok) {
                  const metaJson = await metaRes.json();
                  if (metaJson?.success && metaJson?.data) {
                    nameMap[asset.symbol] = metaJson.data.name || asset.symbol;
                    // Get logo URL from meta - use direct URL (CoinGecko allows CORS for images)
                    // Prefer small for better performance, fallback to thumb or large
                    const logoUrl = metaJson.data.image?.small || metaJson.data.image?.thumb || metaJson.data.image?.large;
                    if (logoUrl) {
                      // Verify logo URL is valid before setting
                      const img = new Image();
                      const logoValid = await new Promise<boolean>((resolve) => {
                        img.onload = () => resolve(true);
                        img.onerror = () => resolve(false);
                        img.src = logoUrl;
                        // Timeout after 3 seconds
                        setTimeout(() => resolve(false), 3000);
                      });
                      
                      if (logoValid) {
                        // Use direct URL - CoinGecko images are CORS-friendly
                        logoMap[asset.symbol] = logoUrl;
                        console.log(`✅ Logo URL verified and set for ${asset.symbol}:`, logoUrl);
                      } else {
                        console.warn(`⚠️ Logo URL failed verification for ${asset.symbol}:`, logoUrl);
                        // Try alternative size
                        const altUrl = metaJson.data.image?.large || metaJson.data.image?.thumb;
                        if (altUrl && altUrl !== logoUrl) {
                          logoMap[asset.symbol] = altUrl;
                          console.log(`✅ Using alternative logo URL for ${asset.symbol}:`, altUrl);
                        }
                      }
                    } else {
                      console.warn(`⚠️ No logo URL found in meta for ${asset.symbol}`);
                    }
                  }
                }
              } catch (error) {
                console.warn(`Failed to fetch crypto meta for ${asset.symbol}:`, error);
              }
            } else {
              // For stocks, try direct browser URLs first (Clearbit, IEX)
              const ticker = asset.symbol.toUpperCase().replace('.JK', '');
              const domainMap: Record<string, string> = {
                BBCA: 'bca.co.id', BBRI: 'bri.co.id', BMRI: 'bankmandiri.co.id',
                BBNI: 'bni.co.id', TLKM: 'telkom.co.id', ASII: 'astra.co.id',
                GOTO: 'goto.com', UNVR: 'unilever.co.id', ICBP: 'icbpfood.com',
                INDF: 'indofood.com', PGAS: 'pertamina.com', AAPL: 'apple.com',
                MSFT: 'microsoft.com', TSLA: 'tesla.com', GOOGL: 'google.com',
                AMZN: 'amazon.com', META: 'meta.com', NVDA: 'nvidia.com',
              };
              const domain = domainMap[ticker];
              
              // Try Clearbit direct URL first (from browser, no proxy needed)
              if (domain) {
                const clearbitUrl = `https://logo.clearbit.com/${domain}`;
                console.log(`🚀 [ComparisonWidget] Setting Clearbit direct URL for ${asset.symbol}:`, clearbitUrl);
                logoMap[asset.symbol] = clearbitUrl;
              } else {
                // Try IEX direct URL
                const iexUrl = `https://storage.googleapis.com/iexcloud-hl37opg/api/logos/${ticker}.png`;
                console.log(`🚀 [ComparisonWidget] Setting IEX direct URL for ${asset.symbol}:`, iexUrl);
                logoMap[asset.symbol] = iexUrl;
              }
              
              // Also try logo API for potentially better quality logo (Yahoo Finance)
              try {
                console.log(`📡 [ComparisonWidget] Also fetching from logo API for ${asset.symbol}...`);
                const res = await fetch('/api/logo', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    symbol: asset.symbol,
                    type: 'stock'
                  }),
                });
                
                if (res.ok) {
                  const json = await res.json();
                  if (json?.success && json?.logoUrl) {
                    // Use direct logoUrl from browser (Yahoo Finance, etc.)
                    console.log(`✅ [ComparisonWidget] Better logo URL from API for ${asset.symbol}:`, json.logoUrl);
                    logoMap[asset.symbol] = json.logoUrl; // Override with better quality logo
                  }
                }
              } catch (error) {
                console.warn(`⚠️ [ComparisonWidget] Logo API fetch failed for ${asset.symbol}, using direct URL:`, error);
                // Keep the direct URL we set above
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch logo for ${asset.symbol}:`, error);
          }
        }
        
        if (!nameMap[asset.symbol]) {
          nameMap[asset.symbol] = asset.name || asset.symbol;
        }
      }
      
      console.log('📊 [ComparisonWidget] Logo fetch complete:', { 
        logoMap, 
        nameMap,
        symbols: assets.map(a => a.symbol),
        logosFound: Object.keys(logoMap).length
      });
      setAssetLogos(logoMap);
      setAssetNames(nameMap);
    };
    
    if (assets && assets.length > 0) {
      fetchLogos();
    }
  }, [assets, assetType]);

  const handleTimeframeChange = async (tf: string) => {
    if (isLoadingTimeframe || tf === selectedTimeframe) return;
    
    setIsLoadingTimeframe(true);
    setSelectedTimeframe(tf);
    
    try {
      if (onTimeframeChange) {
        // Call parent callback to fetch new data
        await onTimeframeChange(tf, assets.map(a => a.symbol));
      } else {
        // If no callback, just update local state (data will be updated by parent)
        console.log('Timeframe changed to:', tf);
      }
    } catch (error) {
      console.error('Error changing timeframe:', error);
      // Revert on error
      setSelectedTimeframe(timeframe);
    } finally {
      setIsLoadingTimeframe(false);
    }
  };

  const handleScreenshot = () => {
    if (!chartContainerRef.current) return;
    
    // Use html2canvas or similar library for screenshot
    // For now, just trigger download of chart as image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // This is a placeholder - in production, use html2canvas library
    alert('Screenshot functionality requires html2canvas library. Please install it: npm install html2canvas');
  };

  const handleDownload = () => {
    // Export chart data as CSV
    const csv = [
      [xKey, ...yKeys].join(','),
      ...chartData.map(row => [
        row[xKey],
        ...yKeys.map(key => row[key] || '')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${selectedTimeframe}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Detect if stock is Indonesian (IDX)
  const isIndonesianStock = (symbol: string): boolean => {
    const s = symbol.toUpperCase();
    // Check if ends with .JK or is a known Indonesian stock symbol
    if (s.endsWith('.JK')) return true;
    
    // Known Indonesian stock symbols (4 uppercase letters typically)
    const idxSymbols = [
      'GOTO', 'BBRI', 'BBCA', 'BBNI', 'BMRI', 'TLKM', 'ASII', 'UNVR', 'ICBP',
      'BRI', 'BCA',
      'INDF', 'PGAS', 'ADRO', 'KLBF', 'GGRM', 'SMGR', 'ANTM', 'INCO', 'PTBA',
      'JSMR', 'WIKA', 'BSDE', 'CTRA', 'EXCL', 'ISAT', 'MYOR', 'ROTI', 'ULTJ',
      'BNGA', 'BJBR', 'BTPN', 'BNII', 'WEGE', 'ADHI', 'DMAS', 'TKIM', 'CPIN',
      'SRIL', 'AKRA', 'AXSI', 'IGAR', 'JAGG', 'JAGO', 'ARTO', 'EMTK', 'SCMA',
      'ACES', 'AMRT', 'ESSA', 'JPFA', 'MAIN', 'MDKA', 'PANI', 'SMRA', 'TAPG',
      'TPIA', 'UNTR', 'TOWR', 'BRIS', 'BBTN', 'MEGA', 'NISP', 'BUAH', 'BJTM',
      'SDRA', 'NOBU', 'MEDC', 'BUMI'
    ];
    return idxSymbols.includes(s) || (s.length === 4 && /^[A-Z]{4}$/.test(s) && assetType === 'stock');
  };

  // Check if any asset is Indonesian
  const hasIndonesianAssets = assets.some(a => isIndonesianStock(a.symbol));

  const formatPrice = (price: number, symbol?: string): string => {
    // Find asset info if available to check for explicit currency
    const asset = symbol ? assets.find(a => a.symbol === symbol) : undefined;
    
    // Use explicit currency if provided by the data pipeline
    const explicitCurrency = asset?.currency;
    const isIDR = explicitCurrency === 'IDR' || (explicitCurrency === undefined && (symbol ? isIndonesianStock(symbol) : hasIndonesianAssets));
    
    if (isIDR) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatChange = (change: number, symbol?: string): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${formatPrice(Math.abs(change), symbol)}`;
  };

  const formatPercent = (percent: number): string => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const getAssetColor = (index: number): string => {
    return assets[index]?.color || ASSET_COLORS[index % ASSET_COLORS.length];
  };

  // Calculate percentage change data for chart
  const percentageChartData = chartData.map((point) => {
    const result: Record<string, any> = { [xKey]: point[xKey] };
    yKeys.forEach((key, index) => {
      // Calculate percentage change from first point
      const firstValue = chartData[0]?.[key] || 0;
      const currentValue = point[key] || 0;
      if (firstValue !== 0) {
        result[key] = ((currentValue - firstValue) / firstValue) * 100;
      } else {
        result[key] = 0;
      }
    });
    return result;
  });

  return (
    <Card className={cn(
      "my-0 w-full max-w-7xl mx-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500",
      "bg-gradient-to-br from-black/70 via-black/50 to-black/70",
      "border-cyan-500/20 shadow-2xl overflow-hidden rounded-2xl backdrop-blur-3xl",
      "hover:border-cyan-500/30 transition-all duration-300"
    )}>
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b border-cyan-500/10 bg-black/40 px-6 py-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 p-[1px]">
            <div className="w-full h-full rounded-xl bg-black flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Analisis Tren & Strategi
            </CardTitle>
            <p className="text-xs text-gray-500 font-medium">Market Insight Comparison Engine v1.0</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* User Persona Switcher */}
          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5">
            {[
              { id: 'investor', label: 'Investor', icon: Briefcase },
              { id: 'trader', label: 'Trader', icon: TrendingUp },
              { id: 'education', label: 'Edukasi', icon: MessageCircle }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setUserPersona(p.id as any);
                  onPersonaChange?.(p.id as any);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
                  userPersona === p.id 
                    ? "bg-cyan-500 text-black" 
                    : "text-gray-400 hover:text-white"
                )}
              >
                <p.icon className="w-3.5 h-3.5" />
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex bg-black/30 p-1 rounded-xl border border-white/10">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                disabled={isLoadingTimeframe}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all tabular-nums",
                  selectedTimeframe === tf
                    ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                  isLoadingTimeframe && "opacity-50 cursor-not-allowed"
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      {/* Header with Asset Info */}
      <CardHeader className="relative pb-4 pt-6 px-6 border-b border-cyan-500/20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset, index) => (
            <div
              key={`${asset.symbol}-${index}`}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl",
                "bg-black/20",
                "border border-cyan-500/10",
                "hover:border-cyan-500/30 hover:bg-black/30 transition-all duration-300"
              )}
            >
              {/* Logo */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg overflow-hidden border-2 border-cyan-500/30 shadow-lg"
                style={{ backgroundColor: assetLogos[asset.symbol] ? 'transparent' : getAssetColor(index) }}
              >
                {assetLogos[asset.symbol] ? (
                  <img 
                    key={`${asset.symbol}-${assetLogos[asset.symbol]}`}
                    src={assetLogos[asset.symbol]} 
                    alt={`${asset.symbol} logo`}
                    className="w-full h-full object-cover"
                    loading="eager"
                    crossOrigin="anonymous"
                    onLoad={(e) => {
                      // Logo loaded successfully, ensure parent has transparent background
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.style.backgroundColor = 'transparent';
                      }
                    }}
                    onError={(e) => {
                      // Logo failed to load, try alternative sizes for crypto
                      if (assetType === 'crypto') {
                        const target = e.currentTarget;
                        const symbol = asset.symbol;
                        const currentSrc = target.src;
                        
                        // Try different image sizes from CoinGecko
                        fetch('/api/coingecko/meta', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ symbol }),
                        })
                        .then(res => res.json())
                        .then(json => {
                          if (json?.success && json?.data?.image) {
                            // Try large, then thumb if small failed
                            const altUrl = json.data.image.large || json.data.image.thumb;
                            if (altUrl && altUrl !== currentSrc) {
                              target.src = altUrl;
                              target.onerror = () => {
                                // All sizes failed, use fallback
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = symbol.substring(0, 2);
                                  parent.style.backgroundColor = getAssetColor(index);
                                }
                              };
                            } else {
                              // No alternative URL, use fallback
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = symbol.substring(0, 2);
                                parent.style.backgroundColor = getAssetColor(index);
                              }
                            }
                          } else {
                            // No logo available, use fallback
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = symbol.substring(0, 2);
                              parent.style.backgroundColor = getAssetColor(index);
                            }
                          }
                        })
                        .catch(() => {
                          // Error fetching meta, use fallback
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = symbol.substring(0, 2);
                            parent.style.backgroundColor = getAssetColor(index);
                          }
                        });
                      } else {
                        // For stocks, try alternative sources if current failed
                        const target = e.currentTarget;
                        const currentSrc = target.src;
                        
                        // If proxy URL failed, try direct URL from API
                        if (currentSrc.includes('/api/logo')) {
                          fetch('/api/logo', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ symbol: asset.symbol, type: 'stock' }),
                          })
                          .then(res => res.json())
                          .then(json => {
                            if (json?.success && json?.logoUrl && json.logoUrl !== currentSrc) {
                              target.src = json.logoUrl;
                            } else {
                              // All sources failed, use fallback
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = asset.symbol.substring(0, 2);
                                parent.style.backgroundColor = getAssetColor(index);
                              }
                            }
                          })
                          .catch(() => {
                            // API call failed, use fallback
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = asset.symbol.substring(0, 2);
                              parent.style.backgroundColor = getAssetColor(index);
                            }
                          });
                        } else {
                          // Direct URL failed, try proxy URL
                          target.src = `/api/logo?symbol=${encodeURIComponent(asset.symbol)}&type=stock`;
                          target.onerror = () => {
                            // Proxy also failed, use fallback
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = asset.symbol.substring(0, 2);
                              parent.style.backgroundColor = getAssetColor(index);
                            }
                          };
                        }
                      }
                    }}
                  />
                ) : (
                  asset.symbol.substring(0, 2)
                )}
              </div>

              {/* Asset Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-baseline gap-2 mb-1.5">
                  <h3 className="text-white font-semibold text-base truncate">
                    {assetNames[asset.symbol] || asset.name || asset.symbol}
                  </h3>
                  {asset.exchange && (
                    <span className="text-gray-400 text-xs font-medium">({asset.exchange})</span>
                  )}
                </div>
                <div className="text-cyan-400 font-mono text-sm font-semibold">
                  {asset.symbol}
                </div>
              </div>

              {/* Price Info */}
              <div className="text-right flex flex-col justify-center">
                <div className="text-white font-bold text-2xl mb-1">
                  {formatPrice(asset.currentPrice, asset.symbol)}
                </div>
                <div className={cn(
                  "text-base font-semibold flex items-center gap-1.5 justify-end",
                  asset.change >= 0 
                    ? "text-green-400" 
                    : "text-red-400"
                )}>
                  {asset.change >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="font-mono">{formatChange(asset.change, asset.symbol)}</span>
                  <span className="font-mono">({formatPercent(asset.changePercent)})</span>
                </div>
                
                {/* RSI & Trend Badges */}
                <div className="flex flex-wrap gap-2 justify-end mt-2">
                  {asset.engine?.condition && (
                    <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white border border-white/20 uppercase">
                      {asset.engine.condition.replace('_', ' ')}
                    </div>
                  )}
                  {asset.rsi !== undefined && (
                    <div className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase border",
                      asset.rsi < 20 ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse" :
                      asset.rsi < 30 ? "bg-green-500/10 text-green-400 border-green-500/30" :
                      asset.rsi > 70 ? "bg-red-500/10 text-red-400 border-red-500/30" :
                      "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    )}>
                      RSI: {asset.rsi.toFixed(1)} {asset.rsi < 20 ? '🔥 EXTREME' : ''}
                    </div>
                  )}
                </div>

                {/* Risk Parameters (Production-Ready) */}
                {asset.engine?.stopLoss && (
                  <div className="flex gap-4 justify-end mt-3 border-t border-white/5 pt-2">
                    <div className="text-[9px] text-gray-400 flex flex-col items-end">
                      <span className="uppercase opacity-60">Stop Loss</span>
                      <span className="text-red-400 font-mono font-bold leading-none mt-0.5">
                        {formatPrice(asset.engine.stopLoss, asset.symbol)}
                      </span>
                    </div>
                    {asset.engine.invalidation && (
                      <div className="text-[9px] text-gray-400 flex flex-col items-end">
                        <span className="uppercase opacity-60">Invalidation</span>
                        <span className="text-purple-400 font-mono font-bold leading-none mt-0.5">
                          {formatPrice(asset.engine.invalidation, asset.symbol)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {asset.timestamp && (
                  <div className="text-gray-400 text-[10px] mt-2 italic opacity-60">
                    Terakhir diperbarui: {asset.timestamp.split(',')[1] || asset.timestamp}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardHeader>

      {/* Navigation Bar */}
      <div className="relative px-6 py-4 border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                disabled={isLoadingTimeframe}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "relative group",
                  selectedTimeframe === tf
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    : "text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 hover:border hover:border-cyan-500/20"
                )}
                title={`View ${tf} timeframe`}
              >
                {isLoadingTimeframe && selectedTimeframe === tf ? (
                  <span className="flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    {tf}
                  </span>
                ) : tf}
                {selectedTimeframe === tf && !isLoadingTimeframe && (
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
                )}
              </button>
            ))}
            {isLoadingTimeframe && (
              <span className="ml-2 text-xs text-cyan-400 animate-pulse">Memuat data...</span>
            )}
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                // Calendar picker - could open a date range picker
                alert('Date range picker - Coming soon!');
              }}
              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
              title="Select Date Range"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                // Cycle through chart types
                const types: ('line' | 'area' | 'candlestick')[] = ['line', 'area', 'candlestick'];
                const currentIndex = types.indexOf(chartType);
                const nextType = types[(currentIndex + 1) % types.length];
                setChartType(nextType);
                onChartTypeChange?.(nextType);
              }}
              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
              title="Change Chart Type"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button 
              onClick={handleScreenshot}
              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
              title="Take Screenshot"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button 
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
              title="Download Data"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef}>
        <CardContent className="relative px-6 pb-8 pt-6">
        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-1 border border-cyan-500/20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Zoom in using brush - user can drag brush to zoom
                const brush = document.querySelector('.recharts-brush');
                if (brush) {
                  brush.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all"
              title="Zoom In (Use brush below chart)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Reset zoom by resetting brush
                // This will be handled by brush component itself
                alert('Gunakan brush di bawah chart untuk zoom. Drag untuk memilih range, double-click untuk reset.');
              }}
              className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all"
              title="Zoom Out (Double-click brush to reset)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
        </div>
        
        <ResponsiveContainer width="100%" height={520}>
          <LineChart 
            data={percentageChartData} 
            margin={{ top: 10, right: 20, left: 10, bottom: 60 }}
            style={{ cursor: 'crosshair' }}
          >
            <defs>
              {yKeys.map((key, index) => {
                const color = getAssetColor(index);
                return (
                  <linearGradient key={`gradient-${key}`} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(6, 182, 212, 0.1)" 
              strokeWidth={1}
            />
            <XAxis
              dataKey={xKey}
              stroke="rgba(148, 163, 184, 0.7)"
              tick={{ fill: 'rgba(203, 213, 225, 0.9)', fontSize: 13, fontWeight: 600 }}
              tickMargin={12}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
            />
            <YAxis
              stroke="rgba(148, 163, 184, 0.7)"
              tick={{ fill: 'rgba(203, 213, 225, 0.9)', fontSize: 13, fontWeight: 600 }}
              tickMargin={12}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
              label={{ value: '% Change', angle: -90, position: 'insideLeft', fill: 'rgba(203, 213, 225, 0.9)', fontSize: 13, fontWeight: 600 }}
              tickFormatter={(value) => `${value}%`}
            />
            <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.3)" strokeDasharray="5 5" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '12px',
                padding: '12px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2), 0 0 0 1px rgba(6, 182, 212, 0.1)',
              }}
              labelStyle={{ 
                color: '#06b6d4', 
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '10px'
              }}
              itemStyle={{ 
                color: '#ffffff',
                padding: '5px 0',
                fontSize: '13px',
                fontWeight: 500
              }}
              formatter={(value: any) => `${Number(value).toFixed(2)}%`}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              wrapperStyle={{
                paddingBottom: '20px',
                paddingTop: '0px',
                fontSize: '14px',
                fontWeight: 600
              }}
            />
            <Brush
              dataKey={xKey}
              height={30}
              stroke="rgba(6, 182, 212, 0.6)"
              fill="rgba(6, 182, 212, 0.15)"
              tickFormatter={(value) => {
                // Format date for brush
                if (typeof value === 'string') {
                  try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
                    }
                  } catch {
                    // If date parsing fails, return as is
                  }
                }
                return String(value).substring(0, 10);
              }}
              startIndex={0}
              endIndex={Math.min(percentageChartData.length - 1, 20)} // Show last 20 points by default
            />
            {yKeys.map((key, index) => {
              const color = getAssetColor(index);
              const asset = assets.find(a => a.symbol === key);
              // Ensure color consistency: use the same color from asset or fallback to ASSET_COLORS
              const lineColor = asset?.color || color;
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={lineColor}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ 
                    r: 7, 
                    fill: lineColor,
                    stroke: '#000',
                    strokeWidth: 2.5,
                    style: { filter: `drop-shadow(0 0 8px ${lineColor})` }
                  }}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                  style={{ filter: `drop-shadow(0 0 4px ${lineColor}90)` }}
                  name={asset?.name || key}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
        
        {assets.length >= 2 && (
          <div className={cn(
            "mt-6 p-5 rounded-xl border transition-all duration-300 relative overflow-hidden",
            "bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 border-cyan-500/20",
            isAnalyzing && "opacity-60 cursor-wait"
          )}>
            {/* AI Narrative Loading Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-6 bg-cyan-500 animate-[bounce_1s_infinite_0ms]" />
                    <div className="w-1.5 h-6 bg-purple-500 animate-[bounce_1s_infinite_200ms]" />
                    <div className="w-1.5 h-6 bg-cyan-500 animate-[bounce_1s_infinite_400ms]" />
                  </div>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Re-Analyzing for {userPersona}...</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Sparkles className={cn("w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5", isAnalyzing && "animate-pulse")} />
              <div className="flex-1">
                <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed space-y-3">
                  {narrative ? (
                    <div dangerouslySetInnerHTML={{ __html: narrative.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p>
                      {(() => {
                        const sorted = [...assets].sort((a, b) => b.changePercent - a.changePercent);
                    const winner = sorted[0];
                    const loser = sorted[sorted.length - 1];
                    const diff = winner.changePercent - loser.changePercent;
                    const timeframeLabel = selectedTimeframe === '1D' ? 'hari ini' : 
                                         selectedTimeframe === '1M' ? '1 bulan terakhir' :
                                         selectedTimeframe === '6M' ? '6 bulan terakhir' :
                                         selectedTimeframe === 'YTD' ? 'tahun ini' :
                                         selectedTimeframe === '1Y' ? '1 tahun terakhir' :
                                         selectedTimeframe === '5Y' ? '5 tahun terakhir' : 'periode ini';
                    
                    if (diff > 0) {
                      return (
                        <span>
                          Dalam <strong className="text-cyan-400">{timeframeLabel}</strong>,{' '}
                          <strong className="text-white">{winner.symbol}</strong> outperform{' '}
                          <strong className="text-white">{loser.symbol}</strong> sebesar{' '}
                          <strong className={diff > 5 ? "text-green-400" : "text-cyan-400"}>
                            {diff.toFixed(2)}%
                          </strong>
                        </span>
                      );
                    } else {
                      return (
                        <span>
                          Semua aset menunjukkan performa yang relatif seimbang dalam{' '}
                          <strong className="text-cyan-400">{timeframeLabel}</strong>.
                        </span>
                      );
                    }
                  })()}
                    </p>
                  )}
                </div>

                {/* AI Confidence Gauge (Production-Ready) */}
                {(() => {
                  const avgConfidence = assets.reduce((acc, a) => acc + (a.engine?.confidence || 50), 0) / assets.length;
                  return (
                    <div className="mt-4 pt-3 border-t border-cyan-500/10 space-y-2">
                       <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 font-bold uppercase tracking-wider">AI Analysis Signal Quality</span>
                          <span className={cn(
                            "font-bold",
                            avgConfidence > 75 ? "text-green-400" : avgConfidence > 50 ? "text-cyan-400" : "text-yellow-400"
                          )}>{avgConfidence.toFixed(0)}% Confidence</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                          <div 
                            className={cn(
                              "h-full transition-all duration-1000 ease-out",
                              avgConfidence > 75 ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : 
                              avgConfidence > 50 ? "bg-cyan-500 shadow-[0_0_10px_#06b6d4]" : "bg-yellow-500"
                            )}
                            style={{ width: `${avgConfidence}%` }}
                          />
                       </div>
                    </div>
                  )
                })()}

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <button className="text-[11px] px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg border border-cyan-500/30 transition-all flex items-center gap-1.5 group">
                    <TrendingUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    Bandingkan Timeframe Lain
                  </button>
                  <button className="text-[11px] px-3 py-1.5 bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-all">
                    Lihat Detail Aset
                  </button>
                  <button className="text-[11px] px-3 py-1.5 bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-all">
                    + Watchlist
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </div>

      {/* Comparison Table */}
      <div className="relative px-6 pb-6 pt-4 border-t border-cyan-500/20">
        <div className="space-y-2">
          {assets.map((asset, index) => {
            const color = getAssetColor(index);
            return (
              <div
                key={`${asset.symbol}-${index}`}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg",
                  "bg-black/20",
                  "border border-cyan-500/10",
                  "hover:border-cyan-500/30 hover:bg-black/30 transition-all duration-200"
                )}
              >
                {/* Logo */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden border border-cyan-500/20"
                  style={{ backgroundColor: assetLogos[asset.symbol] ? 'transparent' : color }}
                >
                  {assetLogos[asset.symbol] ? (
                    <img 
                      src={assetLogos[asset.symbol]} 
                      alt={asset.symbol} 
                      className="w-full h-full object-cover"
                      loading="eager"
                      onLoad={(e) => {
                        // Logo loaded successfully
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.style.backgroundColor = 'transparent';
                        }
                      }}
                      onError={(e) => {
                        // Logo failed to load, try alternative sizes for crypto
                        if (assetType === 'crypto') {
                          const target = e.currentTarget;
                          const symbol = asset.symbol;
                          const currentSrc = target.src;
                          
                          // Try different image sizes from CoinGecko
                          fetch('/api/coingecko/meta', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ symbol }),
                          })
                          .then(res => res.json())
                          .then(json => {
                            if (json?.success && json?.data?.image) {
                              // Try large, then thumb if small failed
                              const altUrl = json.data.image.large || json.data.image.thumb;
                              if (altUrl && altUrl !== currentSrc) {
                                target.src = altUrl;
                                target.onerror = () => {
                                  // All sizes failed, use fallback
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = symbol.substring(0, 2);
                                    parent.style.backgroundColor = color;
                                  }
                                };
                              } else {
                                // No alternative URL, use fallback
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = symbol.substring(0, 2);
                                  parent.style.backgroundColor = color;
                                }
                              }
                            } else {
                              // No logo available, use fallback
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = symbol.substring(0, 2);
                                parent.style.backgroundColor = color;
                              }
                            }
                          })
                          .catch(() => {
                            // Error fetching meta, use fallback
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = symbol.substring(0, 2);
                              parent.style.backgroundColor = color;
                            }
                          });
                        } else {
                          // For stocks, try proxy URL if direct failed
                          const target = e.currentTarget;
                          const currentSrc = target.src;
                          if (!currentSrc.includes('/api/logo')) {
                            // Try proxy URL
                            target.src = `/api/logo?symbol=${encodeURIComponent(asset.symbol)}&type=stock`;
                            target.onerror = () => {
                              // Proxy also failed, use fallback
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = asset.symbol.substring(0, 2);
                                parent.style.backgroundColor = color;
                              }
                            };
                          } else {
                            // Already tried proxy, use fallback
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = asset.symbol.substring(0, 2);
                              parent.style.backgroundColor = color;
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    asset.symbol.substring(0, 2)
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm">
                    {assetNames[asset.symbol] || asset.name || asset.symbol}
                  </div>
                  <div className="text-cyan-400 font-mono text-xs">
                    {asset.symbol}
                  </div>
                </div>

                {/* Price */}
                <div className="text-white font-semibold text-sm">
                  {formatPrice(asset.currentPrice, asset.symbol)}
                </div>

                {/* Change */}
                <div className={cn(
                  "text-sm font-medium flex items-center gap-1",
                  asset.change >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {asset.change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{formatChange(asset.change, asset.symbol)}</span>
                </div>

                {/* Percent */}
                <div className={cn(
                  "text-sm font-medium w-20 text-right",
                  asset.changePercent >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatPercent(asset.changePercent)}
                </div>

                {/* Remove Button */}
                {onRemoveAsset && (
                  <button
                    onClick={() => onRemoveAsset(asset.symbol)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="px-6 py-4 bg-black/40 border-t border-cyan-500/10 text-[10px] text-gray-500 italic text-center rounded-b-2xl">
        Catatan: Indikator teknikal (RSI, MA20) dan AI Insight didasarkan pada data historis. Ini bukan merupakan saran investasi atau jaminan performa harga di masa depan.
      </div>
    </Card>
  );
}

