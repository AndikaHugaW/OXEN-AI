'use client';

import { useState, useCallback } from 'react';
import ComparisonWidget, { AssetInfo, ComparisonWidgetProps } from './ComparisonWidget';
import { ChartData } from './ChartRenderer';
import { timeframeToDays } from '@/lib/market/timeframe-utils';

interface ComparisonWidgetWrapperProps {
  chart: ChartData;
  onUpdateChart?: (updatedChart: ChartData) => void;
}

export default function ComparisonWidgetWrapper({ chart, onUpdateChart }: ComparisonWidgetWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentChart, setCurrentChart] = useState(chart);

  const handleTimeframeChange = useCallback(async (timeframe: string, symbols: string[]) => {
    if (!chart.comparisonAssets || !chart.asset_type) return;
    
    setIsLoading(true);
    try {
      const days = timeframeToDays(timeframe);
      const assetType = chart.asset_type;
      
      // Fetch new data for all symbols
      const fetchPromises = symbols.map(async (symbol) => {
        try {
          const endpoint = assetType === 'crypto' ? '/api/coingecko/ohlc' : '/api/market';
          const payload: Record<string, any> = { symbol, days };
          if (endpoint === '/api/market') payload.type = assetType;

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            console.warn(`Failed to fetch data for ${symbol}`);
            return null;
          }

          const data = await response.json();
          if (!data.success || !data.data) {
            console.warn(`Invalid data for ${symbol}`);
            return null;
          }

          return {
            symbol,
            data: data.data,
          };
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      const fetchedData = results.filter((item): item is { symbol: string; data: any } => item !== null);

      if (fetchedData.length === 0) {
        throw new Error('Gagal mengambil data untuk semua aset.');
      }
      
      // Rebuild comparison data similar to market-analysis-handler
      const { calculateIndicators } = await import('@/lib/market/data-fetcher');
      const { preprocessCandlestick } = await import('@/lib/market/candlestick-preprocessor');
      
      // Process each asset's data
      const processedAssets = await Promise.all(
        fetchedData.map(async ({ symbol, data }) => {
          const indicators = calculateIndicators(data.data);
          const preprocessed = preprocessCandlestick(data, indicators);
          
          const closes = data.data.map((d: any) => d.close);
          const first = closes[0] || 1;
          const last = closes[closes.length - 1] || first;
          const periodReturn = ((last - first) / first) * 100;
          const change = last - first;
          
          return {
            symbol,
            marketData: data,
            indicators,
            preprocessed,
            periodReturn,
            change,
          };
        })
      );
      
      // Build normalized chart data (index = 100)
      const normalizeSeriesTo100 = (points: Array<{ time: string; close: number }>) => {
        if (!points.length) return [];
        const base = points[0].close || 1;
        return points.map((p) => ({ time: p.time, value: (p.close / base) * 100 }));
      };
      
      const seriesPoints = processedAssets.map(({ symbol, marketData }) => ({
        symbol,
        points: marketData.data.map((d: any) => ({ time: d.time, close: d.close })),
      }));
      
      // Find common timestamps
      let commonTimes = new Set(seriesPoints[0].points.map((p) => p.time));
      for (const s of seriesPoints.slice(1)) {
        const set = new Set(s.points.map((p) => p.time));
        commonTimes = new Set([...commonTimes].filter((t) => set.has(t)));
      }
      
      const sortedTimes = [...commonTimes].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      const valueBySymbolAndTime: Record<string, Record<string, number>> = {};
      for (const s of seriesPoints) {
        const normalized = normalizeSeriesTo100(s.points.filter((p) => commonTimes.has(p.time)));
        valueBySymbolAndTime[s.symbol] = Object.fromEntries(normalized.map((p) => [p.time, p.value]));
      }
      
      const newChartData = sortedTimes.map((t) => {
        const row: Record<string, any> = { time: new Date(t).toLocaleDateString('id-ID') };
        for (const sym of Object.keys(valueBySymbolAndTime)) {
          row[sym] = valueBySymbolAndTime[sym][t];
        }
        return row;
      });
      
      // Update comparison assets with new prices
      const updatedAssets = processedAssets.map(({ symbol, marketData, change, periodReturn }, index) => {
        const originalAsset = chart.comparisonAssets?.find(a => a.symbol === symbol);
        return {
          symbol,
          name: originalAsset?.name,
          logo: originalAsset?.logo,
          exchange: originalAsset?.exchange,
          currentPrice: marketData.currentPrice ?? marketData.data[marketData.data.length - 1]?.close ?? 0,
          change: change,
          changePercent: periodReturn,
          timestamp: new Date().toLocaleString('id-ID'),
        };
      });
      
      const updatedChart: ChartData = {
        ...currentChart,
        timeframe,
        title: `Perbandingan Performa - ${timeframe}`,
        data: newChartData,
        comparisonAssets: updatedAssets,
      };
      
      setCurrentChart(updatedChart);
      onUpdateChart?.(updatedChart);
    } catch (error) {
      console.error('Error updating timeframe:', error);
      alert('Gagal memperbarui data. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [chart, currentChart, onUpdateChart]);

  if (!currentChart.comparisonAssets || !Array.isArray(currentChart.yKey)) {
    return null;
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
          <div className="text-cyan-400 text-sm font-medium">Memuat data...</div>
        </div>
      )}
      <ComparisonWidget
        assets={currentChart.comparisonAssets}
        chartData={currentChart.data}
        xKey={currentChart.xKey}
        yKeys={Array.isArray(currentChart.yKey) ? currentChart.yKey : [currentChart.yKey]}
        assetType={currentChart.asset_type}
        timeframe={currentChart.timeframe || '1D'}
        onTimeframeChange={handleTimeframeChange}
      />
    </div>
  );
}

