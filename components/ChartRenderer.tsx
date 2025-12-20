'use client';

import React, { useState, useRef } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Download, Loader2 } from 'lucide-react';
import CandlestickChart from './CandlestickChart';
import CoinGeckoWidgetChart from './CoinGeckoWidgetChart';
import TradingViewWidget from './TradingViewWidget';
import ComparisonWidgetWrapper from './ComparisonWidgetWrapper';

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'composed' | 'radar' | 'scatter' | 'table' | 'candlestick' | 'comparison';
  title: string;
  source?: 'internal' | 'external';
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string | string[]; // Support multiple series
  dataKey?: string; // For pie charts
  series?: Array<{ key: string; name?: string; type?: 'line' | 'bar' | 'area' }>; // For composed charts
  columns?: string[]; // For table
  // For candlestick
  symbol?: string;
  currentPrice?: number;
  change24h?: number;
  asset_type?: 'crypto' | 'stock';
  logoUrl?: string; // Logo URL langsung dari API - bisa digunakan langsung di browser
  companyName?: string; // Nama perusahaan dari API
  timeframe?: string; // For comparison widget timeframe
  // For comparison widget
  comparisonAssets?: Array<{
    symbol: string;
    name?: string;
    logo?: string;
    exchange?: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    timestamp?: string;
  }>;
  error?: {
    title: string;
    message: string;
    suggestion?: string;
  };
}

interface ChartRendererProps {
  chart: ChartData;
}

// Web3 Modern Neon Palette for comparisons (stable mapping by key)
const COLORS = [
  '#06b6d4', // cyan (primary)
  '#a855f7', // purple
  '#ec4899', // pink
  '#22d3ee', // light cyan
  '#8b5cf6', // violet
  '#f472b6', // light pink
  '#34d399', // emerald
  '#fbbf24', // amber
  '#60a5fa', // light blue
  '#f59e0b', // orange
];

function colorForKey(key: string): string {
  // Simple deterministic hash → stable color per symbol (BBCA always same color, etc.)
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

// Trend-aware colors
const TREND_COLORS = {
  up: '#22c55e',      // Green
  down: '#ef4444',    // Red
  neutral: '#06b6d4', // Cyan
};

// Helper: Get change from previous data point
function getChangeFromPrevious(
  data: Array<Record<string, any>>,
  currentIndex: number,
  valueKey: string
): { change: number; direction: 'up' | 'down' | 'flat' } | null {
  if (currentIndex <= 0) return null;
  const current = data[currentIndex][valueKey];
  const previous = data[currentIndex - 1][valueKey];
  if (typeof current !== 'number' || typeof previous !== 'number' || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  return { change, direction: change > 1 ? 'up' : change < -1 ? 'down' : 'flat' };
}

export default function ChartRenderer({ chart }: ChartRendererProps) {
  // 🚫 Error State for Sufficiency Validation
  if (chart.error) {
    return (
      <Card className="w-full bg-black/40 border-cyan-500/30 backdrop-blur-sm shadow-xl overflow-hidden">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-yellow-500">⚠️</span> {chart.error.title}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {chart.error.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[250px] space-y-4">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg max-w-md w-full">
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-yellow-500/20 p-1.5 rounded-full">
                <TrendingUp size={16} className="text-yellow-400" />
              </div>
              <div>
                <h4 className="font-medium text-yellow-100 text-sm mb-1">Saran Perbaikan</h4>
                <p className="text-yellow-200/80 text-sm leading-relaxed">
                  {chart.error.suggestion || 'Tambahkan lebih banyak data untuk membuat visualisasi yang bermakna.'}
                </p>
              </div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 mt-4">
            AI menolak membuat chart yang tidak akurat (Enterprise Standard).
          </div>
        </CardContent>
      </Card>
    );
  }
  // 🎨 Chart type toggle (bar ↔ line)
  const [chartTypeOverride, setChartTypeOverride] = useState<'bar' | 'line' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const effectiveChartType = chartTypeOverride || chart.type;

  // 📥 Download chart as PNG
  const handleDownloadChart = async () => {
    if (!chartContainerRef.current || isDownloading) return;
    
    setIsDownloading(true);
    
    // Small delay to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      // Dynamic import html2canvas to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default;
      
      // Clone the element to modify without affecting the UI
      const element = chartContainerRef.current;
      
      const canvas = await html2canvas(element, {
        backgroundColor: '#0a0a0b',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        removeContainer: true,
        // Ignore control buttons
        ignoreElements: (el) => {
          return el.hasAttribute('data-html2canvas-ignore') || 
                 el.classList.contains('chart-controls');
        },
      });
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `oxen-chart-${chart.title?.replace(/\s+/g, '-').toLowerCase() || 'chart'}-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
        setIsDownloading(false);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Failed to download chart:', error);
      setIsDownloading(false);
    }
  };
  
  // 📈 Trend detection for primary series
  const detectTrend = (dataKey: string): 'up' | 'down' | 'neutral' => {
    if (!chart.data || chart.data.length < 2) return 'neutral';
    const values = chart.data
      .map(item => typeof item[dataKey] === 'number' ? item[dataKey] : parseFloat(item[dataKey]))
      .filter(v => !isNaN(v));
    if (values.length < 2) return 'neutral';
    const changePercent = ((values[values.length - 1] - values[0]) / values[0]) * 100;
    if (changePercent > 2) return 'up';
    if (changePercent < -2) return 'down';
    return 'neutral';
  };
  
  const primaryKey = Array.isArray(chart.yKey) ? chart.yKey[0] : chart.yKey;
  const primaryTrend = detectTrend(primaryKey);
  const primaryChangePercent = (() => {
    if (!chart.data || chart.data.length < 2) return 0;
    const values = chart.data.map(d => d[primaryKey]).filter(v => typeof v === 'number');
    if (values.length < 2 || values[0] === 0) return 0;
    return ((values[values.length - 1] - values[0]) / values[0]) * 100;
  })();

  const renderChart = () => {
    // Use effectiveChartType for toggle support
    
    // 🎯 Smart Tooltip with period-over-period change
    const SmartTooltip = ({ active, payload, label }: any) => {
      if (!active || !payload || payload.length === 0) return null;
      
      // Find current index in data
      const currentIndex = chart.data.findIndex((d: any) => d[chart.xKey] === label);
      const yKey = Array.isArray(chart.yKey) ? chart.yKey[0] : chart.yKey;
      const changeInfo = getChangeFromPrevious(chart.data, currentIndex, yKey);
      
      return (
        <div className="bg-black/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3 shadow-xl min-w-[160px]">
          <p className="text-cyan-400 font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-gray-400 text-xs">{entry.name || entry.dataKey}:</span>
              <span className="text-white font-mono text-sm">
                {new Intl.NumberFormat('id-ID', { 
                  style: 'currency', 
                  currency: 'IDR',
                  maximumFractionDigits: 0 
                }).format(entry.value)}
              </span>
            </div>
          ))}
          {changeInfo && (
            <div className={cn(
              "mt-2 pt-2 border-t border-gray-700 text-xs font-medium",
              changeInfo.direction === 'up' && "text-green-400",
              changeInfo.direction === 'down' && "text-red-400",
              changeInfo.direction === 'flat' && "text-gray-400"
            )}>
              {changeInfo.direction === 'up' && '↑'}
              {changeInfo.direction === 'down' && '↓'}
              {changeInfo.direction === 'flat' && '→'}
              {' '}
              {changeInfo.change >= 0 ? '+' : ''}{changeInfo.change.toFixed(1)}% dari sebelumnya
            </div>
          )}
        </div>
      );
    };
    
    switch (effectiveChartType) {
      case 'line':
        const lineYKeys = Array.isArray(chart.yKey) ? chart.yKey : [chart.yKey];
        const isMultiLine = lineYKeys.length > 1;
        // Determine line color based on trend (for single-series)
        const lineColor = !isMultiLine ? (
          primaryTrend === 'up' ? TREND_COLORS.up : 
          primaryTrend === 'down' ? TREND_COLORS.down : 
          TREND_COLORS.neutral
        ) : null;
        
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chart.data} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
              {/* Premium SVG Patterns */}
              <defs>
                {/* Dotted background pattern */}
                <pattern
                  id="line-pattern-dots"
                  x="0"
                  y="0"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx="2"
                    cy="2"
                    r="1"
                    fill="rgba(6,182,212,0.12)"
                  />
                </pattern>
                
                {/* Glow filters for each line */}
                {lineYKeys.map((key) => {
                  const color = isMultiLine ? colorForKey(key) : lineColor!;
                  return (
                    <filter key={`glow-${key}`} id={`glow-filter-${key}`} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  );
                })}
                
                {/* Gradient fills for area under line */}
                {lineYKeys.map((key) => {
                  const color = isMultiLine ? colorForKey(key) : lineColor!;
                  return (
                    <linearGradient key={`lineGradient-${key}`} id={`lineGradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="50%" stopColor={color} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  );
                })}
              </defs>
              
              {/* Dotted background */}
              <rect
                x="0"
                y="0"
                width="100%"
                height="90%"
                fill="url(#line-pattern-dots)"
              />
              
              <CartesianGrid 
                vertical={false}
                strokeDasharray="3 3" 
                stroke="rgba(255,255,255,0.08)" 
              />
              <XAxis 
                dataKey={chart.xKey} 
                stroke="rgba(148, 163, 184, 0.5)"
                tick={{ fill: 'rgba(148, 163, 184, 0.8)', fontSize: 12, fontWeight: 500 }}
                tickMargin={12}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                tickLine={false}
              />
              <YAxis 
                stroke="rgba(148, 163, 184, 0.5)"
                tick={{ fill: 'rgba(148, 163, 184, 0.8)', fontSize: 11 }}
                tickMargin={8}
                width={65}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}M`;
                  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}jt`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return `${value}`;
                }}
              />
              <Tooltip content={SmartTooltip} cursor={{ stroke: 'rgba(6, 182, 212, 0.3)', strokeWidth: 1, strokeDasharray: '5 5' }} />
              <Legend 
                wrapperStyle={{ 
                  color: 'rgba(148, 163, 184, 0.9)', 
                  fontSize: '12px',
                  paddingTop: '20px',
                  fontWeight: 500
                }}
                iconSize={14}
                iconType="line"
              />
              {lineYKeys.map((key, index) => {
                const color = isMultiLine ? colorForKey(key) : lineColor!;
                // For multi-line comparison: first line solid, others dashed
                const isDashed = isMultiLine && index > 0;
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={isMultiLine ? 2.5 : 3}
                    strokeDasharray={isDashed ? '8 4' : undefined}
                    dot={{ 
                      fill: color, 
                      r: 4, 
                      strokeWidth: 2, 
                      stroke: 'rgba(0,0,0,0.8)' 
                    }}
                    activeDot={{ 
                      r: 7, 
                      fill: color,
                      stroke: 'rgba(0,0,0,0.9)',
                      strokeWidth: 2,
                      style: { filter: `drop-shadow(0 0 8px ${color})` }
                    }}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                    style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        const barYKeys = Array.isArray(chart.yKey) ? chart.yKey : [chart.yKey];
        // Determine bar color based on trend
        const barColor = primaryTrend === 'up' ? TREND_COLORS.up : 
                        primaryTrend === 'down' ? TREND_COLORS.down : 
                        TREND_COLORS.neutral;
        
        return (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chart.data} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
              {/* Premium SVG Patterns */}
              <defs>
                {/* Dotted background pattern */}
                <pattern
                  id="bar-pattern-dots"
                  x="0"
                  y="0"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx="2"
                    cy="2"
                    r="1"
                    fill="rgba(6,182,212,0.1)"
                  />
                </pattern>
                
                {/* Hatched pattern for bars */}
                {barYKeys.map((key) => {
                  const color = primaryTrend === 'up' ? '#22c55e' : 
                               primaryTrend === 'down' ? '#ef4444' : '#06b6d4';
                  return (
                    <pattern
                      key={`hatched-${key}`}
                      id={`hatched-pattern-${key}`}
                      patternUnits="userSpaceOnUse"
                      width="8"
                      height="8"
                      patternTransform="rotate(45)"
                    >
                      <rect width="8" height="8" fill={color} fillOpacity="0.15" />
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="8"
                        stroke={color}
                        strokeWidth="3"
                        strokeOpacity="0.4"
                      />
                    </pattern>
                  );
                })}
                
                {/* Gradient for bar border glow */}
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={barColor} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={barColor} stopOpacity={0.6} />
                </linearGradient>
              </defs>
              
              {/* Dotted background */}
              <rect
                x="0"
                y="0"
                width="100%"
                height="90%"
                fill="url(#bar-pattern-dots)"
              />
              
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 3" 
                stroke="rgba(255,255,255,0.08)" 
              />
              <XAxis 
                dataKey={chart.xKey} 
                stroke="rgba(148, 163, 184, 0.5)"
                tick={{ fill: 'rgba(148, 163, 184, 0.8)', fontSize: 12, fontWeight: 500 }}
                tickMargin={12}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                tickLine={false}
              />
              <YAxis 
                stroke="rgba(148, 163, 184, 0.5)"
                tick={{ fill: 'rgba(148, 163, 184, 0.8)', fontSize: 11 }}
                tickMargin={8}
                width={65}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}M`;
                  if (value >= 1000000) return `${(value / 1000000).toFixed(0)}jt`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return `${value}`;
                }}
              />
              <Tooltip content={SmartTooltip} cursor={{ fill: 'rgba(6, 182, 212, 0.08)' }} />
              <Legend 
                wrapperStyle={{ 
                  color: 'rgba(148, 163, 184, 0.9)', 
                  fontSize: '12px',
                  paddingTop: '16px'
                }}
                iconSize={14}
              />
              {barYKeys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={`url(#hatched-pattern-${key})`}
                  stroke={barColor}
                  strokeWidth={2}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const dataKey = chart.dataKey || (Array.isArray(chart.yKey) ? chart.yKey[0] : chart.yKey);
        return (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chart.data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => {
                  const percentValue = percent ? (percent * 100).toFixed(0) : 0;
                  const labelName = name || 'Unknown';
                  // Show shorter label on smaller pie chart
                  return `${labelName.length > 10 ? labelName.substring(0, 8) + '..' : labelName}: ${percentValue}%`;
                }}
                outerRadius={85}
                fill="hsl(var(--primary))"
                dataKey={dataKey}
              >
                {chart.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  color: 'hsl(var(--popover-foreground))',
                  fontSize: '12px',
                }}
              />
              <Legend 
                wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}
                iconSize={12}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        const areaYKeys = Array.isArray(chart.yKey) ? chart.yKey : [chart.yKey];
        const areaConfig = Object.fromEntries(areaYKeys.map((k) => [k, { label: k, color: colorForKey(k) }]));

        return (
          <ChartContainer config={areaConfig} className="h-[320px]">
            <AreaChart data={chart.data} margin={{ top: 10, right: 15, left: 5, bottom: 10 }}>
              <defs>
                {areaYKeys.map((key) => {
                  const color = colorForKey(key);
                  return (
                    <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                      <stop offset="50%" stopColor={color} stopOpacity={0.2} />
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
                dataKey={chart.xKey}
                stroke="rgba(148, 163, 184, 0.5)"
                tick={{ fill: 'rgba(148, 163, 184, 0.8)', fontSize: 11, fontWeight: 500 }}
                tickMargin={10}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
              />
              <YAxis
                stroke="rgba(148, 163, 184, 0.5)"
                tick={{ fill: 'rgba(148, 163, 184, 0.8)', fontSize: 11, fontWeight: 500 }}
                tickMargin={10}
                width={60}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    valueFormatter={(v) => (typeof v === 'number' ? v.toFixed(2) : String(v))} 
                  />
                }
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(6, 182, 212, 0.2), 0 0 0 1px rgba(6, 182, 212, 0.1)',
                }}
                cursor={{ stroke: 'rgba(6, 182, 212, 0.3)', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              <ChartLegend 
                content={<ChartLegendContent />}
                wrapperStyle={{ 
                  color: 'rgba(148, 163, 184, 0.9)', 
                  fontSize: '12px',
                  paddingTop: '20px',
                  fontWeight: 500
                }}
              />
              {areaYKeys.map((key) => {
                const color = colorForKey(key);
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2.5}
                    fill={`url(#fill-${key})`}
                    fillOpacity={1}
                    dot={false}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-out"
                    style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
                  />
                );
              })}
            </AreaChart>
          </ChartContainer>
        );

      case 'composed':
        const composedYKeys = Array.isArray(chart.yKey) ? chart.yKey : [chart.yKey];
        const series = chart.series || composedYKeys.map(key => ({ key, type: 'bar' as const }));
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chart.data} margin={{ top: 10, right: 15, left: 5, bottom: 10 }}>
              <defs>
                {series.map((s, index) => {
                  const color = COLORS[index % COLORS.length];
                  if (s.type === 'area') {
                    return (
                      <linearGradient key={`composedGradient-${s.key}`} id={`composedGradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="50%" stopColor={color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                      </linearGradient>
                    );
                  }
                  return null;
                })}
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(6, 182, 212, 0.1)" 
                strokeWidth={1}
              />
              <XAxis 
                dataKey={chart.xKey} 
                stroke="rgba(148, 163, 184, 0.5)"
                tick={{ fill: 'rgba(148, 163, 184, 0.8)', fontSize: 11, fontWeight: 500 }}
                tickMargin={10}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
              />
              <YAxis 
                stroke="rgba(148, 163, 184, 0.5)"
                tick={{ fill: 'rgba(148, 163, 184, 0.8)', fontSize: 11, fontWeight: 500 }}
                tickMargin={10}
                width={60}
                axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
              />
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
                cursor={{ stroke: 'rgba(6, 182, 212, 0.3)', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              <Legend 
                wrapperStyle={{ 
                  color: 'rgba(148, 163, 184, 0.9)', 
                  fontSize: '12px',
                  paddingTop: '20px',
                  fontWeight: 500
                }}
                iconSize={14}
              />
              {series.map((s, index) => {
                const color = COLORS[index % COLORS.length];
                if (s.type === 'line') {
                  return (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={color}
                      strokeWidth={2.5}
                      dot={{ fill: color, r: 3, strokeWidth: 2, stroke: '#000' }}
                      activeDot={{ 
                        r: 6, 
                        fill: color,
                        stroke: '#000',
                        strokeWidth: 2,
                        style: { filter: `drop-shadow(0 0 6px ${color})` }
                      }}
                      isAnimationActive={true}
                      animationDuration={800}
                      style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
                    />
                  );
                } else if (s.type === 'area') {
                  return (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={color}
                      strokeWidth={2.5}
                      fill={`url(#composedGradient-${s.key})`}
                      fillOpacity={1}
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={800}
                      style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
                    />
                  );
                } else {
                  return (
                    <Bar 
                      key={s.key} 
                      dataKey={s.key} 
                      fill={color} 
                      radius={[8, 8, 0, 0]}
                      style={{ filter: `drop-shadow(0 2px 4px ${color}40)` }}
                    />
                  );
                }
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'radar':
        const radarYKeys = Array.isArray(chart.yKey) ? chart.yKey : [chart.yKey];
        return (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={chart.data}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis 
                dataKey={chart.xKey} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 'auto']}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  color: 'hsl(var(--popover-foreground))',
                  fontSize: '12px',
                }}
              />
              <Legend 
                wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}
                iconSize={12}
              />
              {radarYKeys.map((key, index) => (
                <Radar
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.3}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        const scatterYKeys = Array.isArray(chart.yKey) ? chart.yKey : [chart.yKey];
        return (
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart data={chart.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number"
                dataKey={chart.xKey}
                name={chart.xKey}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                type="number"
                dataKey={scatterYKeys[0]}
                name={scatterYKeys[0]}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  color: 'hsl(var(--popover-foreground))',
                  fontSize: '12px',
                }}
              />
              <Legend 
                wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}
                iconSize={12}
              />
              {scatterYKeys.map((key, index) => (
                <Scatter
                  key={key}
                  name={key}
                  dataKey={key}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'candlestick':
        // Candlestick chart uses separate component
        return null; // Will be handled separately

      case 'comparison':
        // Comparison widget uses wrapper component for state management
        if (!chart.comparisonAssets || !Array.isArray(chart.yKey) || chart.yKey.length === 0) {
          console.error('❌ [ChartRenderer] Invalid comparison properties:', { 
            hasComparisonAssets: !!chart.comparisonAssets,
            comparisonAssetsCount: chart.comparisonAssets?.length,
            yKeyType: typeof chart.yKey,
            isArrayYKey: Array.isArray(chart.yKey),
            yKey: chart.yKey,
            fullChart: chart 
          });
          return (
            <div className="text-destructive text-center p-6 border border-destructive/20 rounded-xl bg-destructive/5">
              <p className="font-semibold mb-2">Gagal memuat grafik perbandingan</p>
              <p className="text-xs opacity-80">Data aset atau sumbu grafik (yKeys) tidak valid atau kosong.</p>
              <p className="text-[10px] mt-4 font-mono opacity-50">Debug: {chart.comparisonAssets ? 'Assets OK' : 'Missing Assets'} | {Array.isArray(chart.yKey) ? `yKey Array (${chart.yKey.length})` : `yKey ${typeof chart.yKey}`}</p>
            </div>
          );
        }
        return <ComparisonWidgetWrapper chart={chart} />;

      default:
        return (
          <div className="text-destructive text-center p-4">
            Chart type not supported: {chart.type}
          </div>
        );
    }
  };

  // Handle candlestick separately (uses external component)
  if (chart.type === 'candlestick') {
    const symbolUpper = (chart.symbol || '').toUpperCase();
    const knownCrypto = new Set(['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'MATIC', 'AVAX', 'DOGE', 'LTC', 'LINK', 'ATOM', 'TRX', 'NEAR', 'APT', 'ARB', 'OP']);
    const resolvedAssetType: 'crypto' | 'stock' =
      chart.asset_type || (knownCrypto.has(symbolUpper) ? 'crypto' : 'stock');

    // For crypto, render CoinGecko embed widget chart (keeps original layout)
    if (resolvedAssetType === 'crypto' && chart.symbol) {
      return (
        <CoinGeckoWidgetChart
          symbol={chart.symbol}
          className="my-0 max-w-4xl mx-auto"
        />
      );
    }

    // For stocks, use TradingView for realtime data
    if (resolvedAssetType === 'stock' && chart.symbol) {
      return (
        <TradingViewWidget
          symbol={chart.symbol}
          assetType="stock"
          height={450}
          showToolbar={true}
          className="my-0 max-w-4xl mx-auto"
        />
      );
    }

    // Fallback to static candlestick if no symbol
    const candlestickData = chart.data.map((item: any) => ({
      time: item.time || item[chart.xKey],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));

    // Calculate metrics from data
    const high = Math.max(...candlestickData.map(d => d.high));
    const low = Math.min(...candlestickData.map(d => d.low));
    const open = candlestickData[0]?.open;
    const prevClose = candlestickData.length > 1 ? candlestickData[candlestickData.length - 2]?.close : undefined;
    const totalVolume = candlestickData.reduce((sum, d) => sum + (d.volume || 0), 0);

    return (
      <CandlestickChart
        title={chart.title}
        data={candlestickData}
        symbol={chart.symbol}
        currentPrice={chart.currentPrice}
        change24h={chart.change24h}
        assetType={resolvedAssetType}
        logoUrl={chart.logoUrl}
        companyName={chart.companyName}
        high={high}
        low={low}
        open={open}
        prevClose={prevClose}
        volume={totalVolume}
      />
    );
  }

  // If comparison type, render directly without Card wrapper (ComparisonWidget has its own)
  if (chart.type === 'comparison') {
    return renderChart();
  }

  return (
    <div ref={chartContainerRef}>
    <Card 
      className={cn(
      "my-0 max-w-4xl mx-auto",
      "bg-gradient-to-br from-black/60 via-black/40 to-black/60",
      "backdrop-blur-xl border border-cyan-500/20",
      "shadow-[0_8px_32px_rgba(6,182,212,0.15),0_0_0_1px_rgba(6,182,212,0.1)]",
      "hover:shadow-[0_12px_48px_rgba(6,182,212,0.25),0_0_0_1px_rgba(6,182,212,0.2)]",
      "transition-all duration-300",
      "relative overflow-hidden"
    )}>
      {/* Animated gradient overlay - hidden in download */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" data-html2canvas-ignore="true" />
      
      {chart.title && (
        <CardHeader className="relative pb-4 pt-6 px-6 border-b border-cyan-500/20">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" data-html2canvas-ignore="true" />
          
          {/* Top row: Title, Badge, and Controls */}
          <div className="flex items-start justify-between gap-4">
            {/* Left side: Title and Badge */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-subtitle text-cyan-400 font-semibold tracking-wide">
                  {chart.title}
                </CardTitle>
                {/* Trend Badge */}
                {primaryChangePercent !== 0 && chart.type !== 'pie' && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 font-mono text-xs",
                      primaryTrend === 'up' && "text-green-500 bg-green-500/10 border-green-500/20",
                      primaryTrend === 'down' && "text-red-500 bg-red-500/10 border-red-500/20",
                      primaryTrend === 'neutral' && "text-gray-400 bg-gray-500/10 border-gray-500/20"
                    )}
                  >
                    {primaryTrend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
                    {primaryTrend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
                    {primaryTrend === 'neutral' && <Minus className="h-3.5 w-3.5" />}
                    <span>{primaryTrend === 'up' ? '+' : ''}{primaryChangePercent.toFixed(1)}%</span>
                  </Badge>
                )}
              </div>
              {/* Unit label - visible in download */}
              <CardDescription className="text-xs text-gray-500">
                Dalam Rupiah (IDR)
              </CardDescription>
            </div>
            
            {/* Right side: Controls - hidden in download */}
            <div className="flex items-center gap-2 chart-controls shrink-0" data-html2canvas-ignore="true">
              {/* Chart Type Toggle */}
              {(chart.type === 'bar' || chart.type === 'line') && (
                <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1 border border-cyan-500/20">
                  <button
                    onClick={() => setChartTypeOverride('bar')}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md transition-all duration-200",
                      effectiveChartType === 'bar' 
                        ? "bg-cyan-500/20 text-cyan-400 font-medium" 
                        : "text-gray-400 hover:text-gray-300"
                    )}
                  >
                    Bar
                  </button>
                  <button
                    onClick={() => setChartTypeOverride('line')}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md transition-all duration-200",
                      effectiveChartType === 'line' 
                        ? "bg-cyan-500/20 text-cyan-400 font-medium" 
                        : "text-gray-400 hover:text-gray-300"
                    )}
                  >
                    Line
                  </button>
                </div>
              )}
              
              {/* Download Button */}
              <button
                onClick={handleDownloadChart}
                disabled={isDownloading}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-200",
                  "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400",
                  "hover:bg-cyan-500/20 hover:border-cyan-500/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                title="Unduh chart sebagai gambar PNG"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isDownloading ? 'Mengunduh...' : 'Unduh'}</span>
              </button>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className="relative px-6 pb-6 pt-6">
        {renderChart()}
      </CardContent>
    </Card>
    </div>
  );
}
