'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, BarChart3, Camera, X, TrendingUp, TrendingDown, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Brush } from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
}

export interface ComparisonWidgetProps {
  assets: AssetInfo[];
  chartData: Array<Record<string, any>>;
  xKey: string;
  yKeys: string[];
  timeframe?: string;
  assetType?: 'crypto' | 'stock';
  onTimeframeChange?: (timeframe: string, symbols: string[]) => Promise<void>;
  onRemoveAsset?: (symbol: string) => void;
  onChartTypeChange?: (type: 'line' | 'area' | 'candlestick') => void;
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
  onRemoveAsset,
  onChartTypeChange,
}: ComparisonWidgetProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [assetLogos, setAssetLogos] = useState<Record<string, string>>({});
  const [assetNames, setAssetNames] = useState<Record<string, string>>({});
  const [isLoadingTimeframe, setIsLoadingTimeframe] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area' | 'candlestick'>('line');
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
      
      for (const asset of assets) {
        if (asset.logo) {
          // Verify existing logo URL
          const img = new Image();
          const logoVerified = await new Promise<boolean>((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = asset.logo!;
            // Timeout after 5 seconds
            setTimeout(() => resolve(false), 5000);
          });
          
          if (logoVerified) {
            logoMap[asset.symbol] = asset.logo;
          }
          
          if (asset.name) nameMap[asset.symbol] = asset.name;
          if (!logoVerified) {
            // Logo invalid, fetch new one below
          } else {
            continue;
          }
        }
        
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
            // For stocks, use logo API endpoint
            try {
              const res = await fetch('/api/logo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  symbol: asset.symbol,
                  type: assetType 
                }),
              });
              
              if (res.ok) {
                const json = await res.json();
                if (json?.success) {
                  // Prefer proxy URL to avoid CORS issues, fallback to direct URL
                  if (json.proxyUrl) {
                    logoMap[asset.symbol] = json.proxyUrl;
                    console.log(`✅ Logo proxy URL set for ${asset.symbol}:`, json.proxyUrl);
                  } else if (json.logoUrl) {
                    logoMap[asset.symbol] = json.logoUrl;
                    console.log(`✅ Logo direct URL set for ${asset.symbol}:`, json.logoUrl);
                  }
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch logo via API for ${asset.symbol}:`, error);
            }
          }
          
          if (!nameMap[asset.symbol]) {
            nameMap[asset.symbol] = asset.name || asset.symbol;
          }
        } catch (error) {
          console.warn(`Failed to fetch logo for ${asset.symbol}:`, error);
          nameMap[asset.symbol] = asset.name || asset.symbol;
        }
      }
      
      console.log('📊 Logo fetch complete:', { logoMap, nameMap });
      setAssetLogos(logoMap);
      setAssetNames(nameMap);
    };
    
    fetchLogos();
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

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${formatPrice(change)}`;
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
      "my-0 max-w-6xl mx-auto",
      "bg-gradient-to-br from-black/70 via-black/50 to-black/70",
      "backdrop-blur-xl border border-cyan-500/30",
      "shadow-[0_8px_32px_rgba(6,182,212,0.2)]",
      "relative overflow-hidden rounded-2xl"
    )}>
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      {/* Header with Asset Info */}
      <CardHeader className="relative pb-4 pt-6 px-6 border-b border-cyan-500/20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset, index) => (
            <div
              key={asset.symbol}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl",
                "bg-black/20",
                "border border-cyan-500/10",
                "hover:border-cyan-500/30 hover:bg-black/30 transition-all duration-300"
              )}
            >
              {/* Logo */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg overflow-hidden border border-cyan-500/20 shadow-md"
                style={{ backgroundColor: assetLogos[asset.symbol] ? 'transparent' : getAssetColor(index) }}
              >
                {assetLogos[asset.symbol] ? (
                  <img 
                    src={assetLogos[asset.symbol]} 
                    alt={asset.symbol} 
                    className="w-full h-full object-cover"
                    loading="eager"
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
                              parent.style.backgroundColor = getAssetColor(index);
                            }
                          };
                        } else {
                          // Already tried proxy, use fallback
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = asset.symbol.substring(0, 2);
                            parent.style.backgroundColor = getAssetColor(index);
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  asset.symbol.substring(0, 2)
                )}
              </div>

              {/* Asset Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold text-sm truncate">
                    {assetNames[asset.symbol] || asset.name || asset.symbol}
                  </h3>
                  {asset.exchange && (
                    <span className="text-gray-400 text-xs">({asset.exchange})</span>
                  )}
                </div>
                <div className="text-cyan-400 font-mono text-xs">
                  {asset.symbol}
                </div>
              </div>

              {/* Price Info */}
              <div className="text-right">
                <div className="text-white font-semibold text-lg">
                  {formatPrice(asset.currentPrice)}
                </div>
                <div className={cn(
                  "text-sm font-medium flex items-center gap-1 justify-end",
                  asset.change >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {asset.change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{formatChange(asset.change)}</span>
                  <span>({formatPercent(asset.changePercent)})</span>
                </div>
                {asset.timestamp && (
                  <div className="text-gray-500 text-xs mt-1">
                    {asset.timestamp}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardHeader>

      {/* Navigation Bar */}
      <div className="relative px-6 py-3 border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                disabled={isLoadingTimeframe}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedTimeframe === tf
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                    : "text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                )}
              >
                {tf}
              </button>
            ))}
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
      <CardContent className="relative px-6 pb-6 pt-4" ref={chartContainerRef}>
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
        
        <ResponsiveContainer width="100%" height={400}>
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
              stroke="rgba(148, 163, 184, 0.5)"
              tick={{ fill: 'rgba(148, 163, 184, 0.8)', fontSize: 11, fontWeight: 500 }}
              tickMargin={10}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
            />
            <YAxis
              stroke="rgba(148, 163, 184, 0.5)"
              tick={{ fill: 'rgba(148, 163, 184, 0.8)', fontSize: 11, fontWeight: 500 }}
              tickMargin={10}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
              label={{ value: '% Change', angle: -90, position: 'insideLeft', fill: 'rgba(148, 163, 184, 0.8)' }}
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
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '8px'
              }}
              itemStyle={{ 
                color: '#ffffff',
                padding: '4px 0'
              }}
              formatter={(value: any) => `${Number(value).toFixed(2)}%`}
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
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ 
                    r: 6, 
                    fill: color,
                    stroke: '#000',
                    strokeWidth: 2,
                    style: { filter: `drop-shadow(0 0 6px ${color})` }
                  }}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-out"
                  style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
                  name={asset?.name || key}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>

      {/* Comparison Table */}
      <div className="relative px-6 pb-6 pt-4 border-t border-cyan-500/20">
        <div className="space-y-2">
          {assets.map((asset, index) => {
            const color = getAssetColor(index);
            return (
              <div
                key={asset.symbol}
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
                  {formatPrice(asset.currentPrice)}
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
                  <span>{formatChange(asset.change)}</span>
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
    </Card>
  );
}

