'use client';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import CandlestickChart from './CandlestickChart';
import CoinGeckoCoinChart from './CoinGeckoCoinChart';
import ComparisonWidgetWrapper from './ComparisonWidgetWrapper';

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'composed' | 'radar' | 'scatter' | 'table' | 'candlestick' | 'comparison';
  title: string;
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

export default function ChartRenderer({ chart }: ChartRendererProps) {
  const renderChart = () => {
    switch (chart.type) {
      case 'line':
        const lineYKeys = Array.isArray(chart.yKey) ? chart.yKey : [chart.yKey];
        return (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chart.data} margin={{ top: 10, right: 15, left: 5, bottom: 10 }}>
              <defs>
                {lineYKeys.map((key, index) => {
                  const color = colorForKey(key);
                  return (
                    <linearGradient key={`lineGradient-${key}`} id={`lineGradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="50%" stopColor={color} stopOpacity={0.15} />
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
                iconType="line"
              />
              {lineYKeys.map((key, index) => {
                const color = colorForKey(key);
                return (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
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
                    animationEasing="ease-out"
                    style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey={chart.xKey} 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickMargin={8}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickMargin={8}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  color: 'hsl(var(--popover-foreground))',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--primary))', fontSize: '12px' }}
              />
              <Legend 
                wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}
                iconSize={12}
              />
              <Bar 
                dataKey={Array.isArray(chart.yKey) ? chart.yKey[0] : chart.yKey} 
                fill="hsl(var(--primary))" 
                radius={[6, 6, 0, 0]} 
              />
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
        if (!chart.comparisonAssets || !Array.isArray(chart.yKey)) {
          return (
            <div className="text-destructive text-center p-4">
              Comparison chart requires comparisonAssets and multiple yKeys
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
    const knownCrypto = new Set(['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'MATIC', 'AVAX', 'DOGE', 'LTC', 'LINK', 'ATOM', 'TRX']);
    const resolvedAssetType: 'crypto' | 'stock' =
      chart.asset_type || (knownCrypto.has(symbolUpper) ? 'crypto' : 'stock');

    // For crypto, render CoinGecko-style per-coin chart (line + gradient + timeframe menu)
    if (resolvedAssetType === 'crypto' && chart.symbol) {
      return (
        <CoinGeckoCoinChart
          symbol={chart.symbol}
          className="my-0 max-w-4xl mx-auto"
        />
      );
    }

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
        logoUrl={chart.logoUrl} // Logo URL langsung dari API - bisa digunakan langsung di browser
        companyName={chart.companyName} // Nama perusahaan dari API
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
    <Card className={cn(
      "my-0 max-w-4xl mx-auto",
      "bg-gradient-to-br from-black/60 via-black/40 to-black/60",
      "backdrop-blur-xl border border-cyan-500/20",
      "shadow-[0_8px_32px_rgba(6,182,212,0.15),0_0_0_1px_rgba(6,182,212,0.1)]",
      "hover:shadow-[0_12px_48px_rgba(6,182,212,0.25),0_0_0_1px_rgba(6,182,212,0.2)]",
      "transition-all duration-300",
      "relative overflow-hidden"
    )}>
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      {chart.title && (
        <CardHeader className="relative pb-4 pt-6 px-6 border-b border-cyan-500/20">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <CardTitle className="text-subtitle text-cyan-400 font-semibold tracking-wide">
            {chart.title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="relative px-6 pb-6 pt-6">
        {renderChart()}
      </CardContent>
    </Card>
  );
}
