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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentChart, setCurrentChart] = useState(chart);
  const [persona, setPersona] = useState<'investor' | 'trader' | 'education'>('investor');
  const [aiNarrative, setAiNarrative] = useState<string | undefined>(undefined);

  const fetchAIAnalysis = async (symbols: string[], timeframe: string, userPersona: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/market/analyze-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols, timeframe, persona: userPersona }),
      });

      if (!response.ok) throw new Error('AI Analysis failed');
      const result = await response.json();
      
      if (result.success && result.response) {
        setAiNarrative(result.response);
      }
    } catch (err) {
      console.error('Error fetching AI analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTimeframeChange = useCallback(async (timeframe: string, symbols: string[]) => {
    if (!chart.comparisonAssets || !chart.asset_type) return;
    
    setIsLoading(true);
    setAiNarrative(undefined); // Clear old narrative while loading
    
    try {
      const days = timeframeToDays(timeframe);
      const assetType = chart.asset_type;
      
      console.log(`📊 [TimeframeChange] Fetching ${symbols.length} ${assetType} symbols for ${timeframe} (${days} days)`);
      
      // Fetch new data for all symbols
      const fetchPromises = symbols.map(async (symbol) => {
        try {
          let endpoint: string;
          let payload: Record<string, any>;
          
          if (assetType === 'crypto') {
            endpoint = '/api/coingecko/ohlc';
            payload = { symbol, days };
          } else {
            // For stocks, use the /api/market endpoint
            endpoint = '/api/market';
            payload = { symbol, days, type: 'stock' };
          }
          
          console.log(`📡 [TimeframeChange] Fetching ${symbol} from ${endpoint}...`);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            console.warn(`⚠️ Failed to fetch data for ${symbol}: ${response.status}`);
            return null;
          }

          const result = await response.json();
          
          // Handle different API response structures
          if (!result.success) {
            console.warn(`⚠️ API returned error for ${symbol}:`, result.error);
            return null;
          }
          
          // The market data could be in result.data or result directly
          const marketData = result.data || result;
          if (!marketData || !marketData.data || !Array.isArray(marketData.data)) {
            console.warn(`⚠️ Invalid data structure for ${symbol}:`, result);
            return null;
          }

          console.log(`✅ [TimeframeChange] Got ${marketData.data.length} data points for ${symbol}`);
          
          return {
            symbol,
            marketData: marketData, // Contains { data: [...], currentPrice, change24h, ... }
          };
        } catch (err) {
          console.error(`❌ Error fetching ${symbol}:`, err);
          return null;
        }
      });

      const results = await Promise.all(fetchPromises);
      const fetchedData = results.filter((item): item is { symbol: string; marketData: any } => item !== null);

      if (fetchedData.length === 0) {
        throw new Error('Gagal mengambil data untuk semua aset.');
      }
      
      console.log(`📊 [TimeframeChange] Successfully fetched ${fetchedData.length}/${symbols.length} symbols`);
      
      // Rebuild comparison data similar to market-analysis-handler
      const { calculateIndicators } = await import('@/lib/market/data-fetcher');
      const { preprocessCandlestick } = await import('@/lib/market/candlestick-preprocessor');
      
      // Process each asset's data
      const processedAssets = await Promise.all(
        fetchedData.map(async ({ symbol, marketData }) => {
          const ohlcData = marketData.data; // Array of OHLC candles
          const indicators = calculateIndicators(ohlcData);
          const preprocessed = preprocessCandlestick(marketData, indicators);
          
          const closes = ohlcData.map((d: any) => d.close);
          const first = closes[0] || 1;
          const last = closes[closes.length - 1] || first;
          const periodReturn = ((last - first) / first) * 100;
          const change = last - first;
          
          return {
            symbol,
            marketData,
            ohlcData,
            indicators,
            preprocessed,
            periodReturn,
            change,
            currentPrice: marketData.currentPrice ?? last,
          };
        })
      );
      
      // Build normalized chart data (index = 100)
      const normalizeSeriesTo100 = (points: Array<{ time: string; close: number }>) => {
        if (!points.length) return [];
        const base = points[0].close || 1;
        return points.map((p) => ({ time: p.time, value: (p.close / base) * 100 }));
      };
      
      const seriesPoints = processedAssets.map(({ symbol, ohlcData }) => ({
        symbol,
        points: ohlcData.map((d: any) => ({ time: d.time, close: d.close })),
      }));
      
      // Find common timestamps
      let commonTimes = new Set(seriesPoints[0].points.map((p: any) => p.time));
      for (const s of seriesPoints.slice(1)) {
        const set = new Set(s.points.map((p: any) => p.time));
        commonTimes = new Set(Array.from(commonTimes).filter((t: any) => set.has(t)));
      }
      
      const sortedTimes = Array.from(commonTimes).sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());
      
      console.log(`📊 [TimeframeChange] Found ${sortedTimes.length} common timestamps`);
      
      const valueBySymbolAndTime: Record<string, Record<string, number>> = {};
      for (const s of seriesPoints) {
        const normalized = normalizeSeriesTo100(s.points.filter((p: any) => commonTimes.has(p.time)));
        valueBySymbolAndTime[s.symbol] = Object.fromEntries(normalized.map((p: any) => [p.time, p.value]));
      }
      
      const newChartData = sortedTimes.map((t: any) => {
        const row: Record<string, any> = { time: new Date(t).toLocaleDateString('id-ID') };
        for (const sym of Object.keys(valueBySymbolAndTime)) {
          row[sym] = valueBySymbolAndTime[sym][t];
        }
        return row;
      });
      
      // Update comparison assets with new prices
      const updatedAssets = processedAssets.map(({ symbol, change, periodReturn, currentPrice }) => {
        const originalAsset = chart.comparisonAssets?.find(a => a.symbol === symbol);
        return {
          symbol,
          name: originalAsset?.name,
          logo: originalAsset?.logo,
          exchange: originalAsset?.exchange,
          currentPrice: currentPrice,
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
      
      console.log(`✅ [TimeframeChange] Chart updated with ${newChartData.length} data points`);
      
      setCurrentChart(updatedChart);
      onUpdateChart?.(updatedChart);
      
      // Trigger AI re-analysis for new timeframe
      await fetchAIAnalysis(symbols, timeframe, persona);
    } catch (error: any) {
      console.error('❌ Error updating timeframe:', error);
      alert(`Gagal memperbarui data: ${error.message || 'Silakan coba lagi.'}`);
    } finally {
      setIsLoading(false);
    }
  }, [chart, currentChart, onUpdateChart, persona]);

  const handlePersonaChange = async (newPersona: 'investor' | 'trader' | 'education') => {
    setPersona(newPersona);
    const symbols = currentChart.comparisonAssets?.map(a => a.symbol) || [];
    const timeframe = currentChart.timeframe || '1D';
    await fetchAIAnalysis(symbols, timeframe, newPersona);
  };

  if (!currentChart.comparisonAssets || !Array.isArray(currentChart.yKey)) {
    return null;
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
          <div className="text-blue-400 text-sm font-medium">Memuat data...</div>
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
        onPersonaChange={handlePersonaChange}
        narrative={aiNarrative}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
}

