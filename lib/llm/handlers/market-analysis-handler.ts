// MODE_MARKET_ANALYSIS Handler
// Handles market analysis requests with:
// 1. Data Validator (OHLC)
// 2. Indicator Engine
// 3. LLaMA (Tech Prompt)
// 4. Function Calling support for dynamic chart rendering

import { getLLMProvider } from '../providers';
import { fetchCryptoData, fetchStockData, calculateIndicators, OHLCData } from '@/lib/market/data-fetcher';
import { preprocessCandlestick } from '@/lib/market/candlestick-preprocessor';
import { extractMultipleSymbols, isMarketDataRequest } from '../chart-generator';
import { extractCandidateTokens, resolveCrypto, resolveStock } from '@/lib/market/asset-resolver';
import { getStructuredPrompt } from '../structured-output';
import { generateMarketVisualization } from '../chart-generator';
import { AIRequestContext, AIRequestResponse, RequestMode, getGlobalPromptRules } from '../ai-request-router';
import { parseFunctionCall, formatFunctionsForPrompt, DISPLAY_COMPARISON_CHART_FUNCTION } from '../function-calling';

/**
 * Data Validator - Validates OHLC data structure and values
 */
function validateOHLCData(data: OHLCData[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || data.length === 0) {
    errors.push('No data provided');
    return { valid: false, errors };
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    // Check required fields
    if (!item.time) errors.push(`Item ${i}: Missing time field`);
    if (item.open === undefined || item.open === null) errors.push(`Item ${i}: Missing open field`);
    if (item.high === undefined || item.high === null) errors.push(`Item ${i}: Missing high field`);
    if (item.low === undefined || item.low === null) errors.push(`Item ${i}: Missing low field`);
    if (item.close === undefined || item.close === null) errors.push(`Item ${i}: Missing close field`);

    // Validate numeric values
    if (item.open !== undefined && (isNaN(item.open) || item.open <= 0)) {
      errors.push(`Item ${i}: Invalid open value (${item.open})`);
    }
    if (item.high !== undefined && (isNaN(item.high) || item.high <= 0)) {
      errors.push(`Item ${i}: Invalid high value (${item.high})`);
    }
    if (item.low !== undefined && (isNaN(item.low) || item.low <= 0)) {
      errors.push(`Item ${i}: Invalid low value (${item.low})`);
    }
    if (item.close !== undefined && (isNaN(item.close) || item.close <= 0)) {
      errors.push(`Item ${i}: Invalid close value (${item.close})`);
    }

    // Validate OHLC relationships
    if (item.high !== undefined && item.low !== undefined && item.high < item.low) {
      errors.push(`Item ${i}: High (${item.high}) is less than Low (${item.low})`);
    }
    if (item.high !== undefined && item.open !== undefined && item.close !== undefined) {
      if (item.high < Math.max(item.open, item.close)) {
        errors.push(`Item ${i}: High should be >= max(open, close)`);
      }
    }
    if (item.low !== undefined && item.open !== undefined && item.close !== undefined) {
      if (item.low > Math.min(item.open, item.close)) {
        errors.push(`Item ${i}: Low should be <= min(open, close)`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Indicator Engine - Calculates technical indicators
 */
function runIndicatorEngine(data: OHLCData[]) {
  console.log('🔢 [Market Handler] Running Indicator Engine...');
  
  // Use existing calculateIndicators function
  const indicators = calculateIndicators(data);
  
  console.log('✅ [Market Handler] Indicators calculated:', indicators);
  
  return indicators;
}

/**
 * Build comprehensive technical analysis from data
 */
function buildTechnicalAnalysis(marketData: any, indicators: any, preprocessed: any, symbol: string, assetType: 'crypto' | 'stock' = 'crypto'): string {
  const summary = preprocessed.summary || {};
  const stats = preprocessed.statistics || {};
  const assetTypeLabel = assetType === 'crypto' ? 'KRIPTO' : 'SAHAM';
  
  let analysis = `━━━━━━━━━━━━━━━━━━━━━━
ANALISIS TEKNIKAL ${assetTypeLabel} ${symbol.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━

1. DATA YANG DIGUNAKAN
   - Timeframe: ${summary.timeframe || 'N/A'}
   - Jumlah data points: ${summary.totalCandles || marketData.data.length}
   - Rentang waktu: ${summary.dateRange?.from ? new Date(summary.dateRange.from).toLocaleDateString('id-ID') : 'N/A'} - ${summary.dateRange?.to ? new Date(summary.dateRange.to).toLocaleDateString('id-ID') : 'N/A'}
   - Sumber data: OHLC yang diberikan

2. FAKTA DARI DATA
   - Harga tertinggi: $${summary.priceRange?.max?.toFixed(2) || 'N/A'}
   - Harga terendah: $${summary.priceRange?.min?.toFixed(2) || 'N/A'}
   - Harga saat ini: $${marketData.currentPrice?.toFixed(2) || summary.priceRange?.current?.toFixed(2) || 'N/A'}
   - Perubahan 24h: ${marketData.change24h !== undefined ? `${marketData.change24h.toFixed(2)}%` : 'N/A'}
   - Volatilitas: ${summary.volatility ? `${summary.volatility.toFixed(2)}%` : 'N/A'}
   - Rata-rata harga: $${stats.averagePrice?.toFixed(2) || 'N/A'}
   - Indikator yang terhitung: ${indicators.rsi !== null ? 'RSI' : ''} ${indicators.ma20 !== null ? 'MA20' : ''} ${indicators.trend ? 'Trend' : ''}

3. ANALISIS TEKNIKAL
   - Interpretasi trend: ${indicators.trend === 'bullish' ? 'BULLISH (Naik)' : indicators.trend === 'bearish' ? 'BEARISH (Turun)' : 'NEUTRAL (Sideways)'}
     ${indicators.trend === 'bullish' ? 'Harga menunjukkan kecenderungan naik berdasarkan pergerakan harga dan indikator.' : indicators.trend === 'bearish' ? 'Harga menunjukkan kecenderungan turun berdasarkan pergerakan harga dan indikator.' : 'Harga bergerak dalam range tertentu tanpa trend jelas.'}
   
   - Analisis RSI: ${indicators.rsi !== null ? `${indicators.rsi.toFixed(2)}` : 'N/A'} 
     ${indicators.rsi !== null ? (indicators.rsi > 70 ? '(Overbought - Harga mungkin akan koreksi turun)' : indicators.rsi < 30 ? '(Oversold - Harga mungkin akan rebound naik)' : '(Neutral - Tidak ada sinyal ekstrem)') : '(Data tidak cukup untuk menghitung RSI)'}
   
   - Analisis MA20: ${indicators.ma20 !== null ? `$${indicators.ma20.toFixed(2)}` : 'N/A'}
     ${indicators.ma20 !== null && marketData.currentPrice ? (marketData.currentPrice > indicators.ma20 ? 'Harga di atas MA20 menunjukkan momentum bullish.' : 'Harga di bawah MA20 menunjukkan momentum bearish.') : ''}
   
   - Level support & resistance: 
     * Support: $${summary.priceRange?.min?.toFixed(2) || 'N/A'} (harga terendah dalam periode)
     * Resistance: $${summary.priceRange?.max?.toFixed(2) || 'N/A'} (harga tertinggi dalam periode)

4. SKENARIO KEMUNGKINAN
   - Skenario 1 (Bullish): ${indicators.trend === 'bullish' ? 'Kemungkinan harga akan melanjutkan kenaikan jika momentum tetap kuat dan volume mendukung. Probabilitas: 60-70%' : 'Jika harga berhasil break resistance, kemungkinan akan naik lebih lanjut. Probabilitas: 40-50%'}
   
   - Skenario 2 (Bearish): ${indicators.trend === 'bearish' ? 'Kemungkinan harga akan melanjutkan penurunan jika momentum bearish tetap kuat. Probabilitas: 60-70%' : 'Jika harga break support, kemungkinan akan turun lebih lanjut. Probabilitas: 40-50%'}
   
   - Skenario 3 (Sideways): ${indicators.trend === 'neutral' ? 'Harga kemungkinan akan tetap bergerak dalam range saat ini. Probabilitas: 50-60%' : 'Jika momentum melemah, harga mungkin akan konsolidasi. Probabilitas: 30-40%'}

5. RISIKO & KETERBATASAN
   - Risiko yang teridentifikasi: 
     * Volatilitas ${summary.volatility && summary.volatility > 5 ? 'tinggi' : 'normal'} dapat menyebabkan pergerakan harga yang tidak terduga
     * Data historis tidak menjamin pergerakan masa depan
     * Faktor eksternal (berita, regulasi) dapat mempengaruhi harga
   
   - Keterbatasan analisis:
     * Analisis ini berdasarkan data historis ${summary.totalCandles || marketData.data.length} data points
     * ${indicators.rsi === null ? 'RSI tidak dapat dihitung karena data kurang' : ''}
     * ${indicators.ma20 === null ? 'MA20 tidak dapat dihitung karena data kurang' : ''}
     * Tidak mempertimbangkan faktor fundamental atau berita terkini
   
   - Disclaimer: Analisis ini berdasarkan data historis dan indikator teknis. Bukan jaminan pergerakan harga di masa depan. Selalu lakukan riset tambahan dan kelola risiko dengan baik.

6. KESIMPULAN SINGKAT
   ${assetType === 'crypto' ? 'Kripto' : 'Saham'} ${symbol.toUpperCase()} menunjukkan trend ${indicators.trend === 'bullish' ? 'bullish' : indicators.trend === 'bearish' ? 'bearish' : 'neutral'} dengan ${indicators.rsi !== null ? `RSI ${indicators.rsi > 70 ? 'overbought' : indicators.rsi < 30 ? 'oversold' : 'neutral'}` : 'indikator terbatas'}. Harga saat ini $${marketData.currentPrice?.toFixed(2) || 'N/A'} dengan perubahan ${marketData.change24h !== undefined ? `${marketData.change24h > 0 ? '+' : ''}${marketData.change24h.toFixed(2)}%` : 'N/A'} dalam 24 jam terakhir. 

   ${indicators.trend === 'bullish' ? 'Dapat dipertimbangkan untuk monitoring lebih lanjut dengan hati-hati terhadap level resistance.' : indicators.trend === 'bearish' ? 'Perlu monitoring lebih lanjut dengan hati-hati terhadap level support. Hati-hati dengan potensi penurunan lebih lanjut.' : 'Perlu monitoring lebih lanjut untuk konfirmasi breakout dari range saat ini.'}

━━━━━━━━━━━━━━━━━━━━━━`;

  return analysis;
}

/**
 * Generate Technical Analysis Prompt for LLaMA
 */
function getTechPrompt(marketData: any, indicators: any, preprocessed: any, assetType: 'crypto' | 'stock' = 'crypto', userMessage?: string): string {
  // Detect language from user message
  const isIndonesian = userMessage ? /[aku|saya|kamu|gimana|bagaimana|tolong|bisa|mau|ingin|punya|dengan|untuk|biar|jelasin|jelaskan|dasar|teori|budget|juta|marketing|alokasi|efektif|tampilkan|chart|grafik|analisis]/i.test(userMessage) : true;
  const isEnglish = userMessage ? /^[a-zA-Z\s.,!?'"-]+$/.test(userMessage.trim().substring(0, 100)) : false;
  const detectedLanguage = isIndonesian ? 'Bahasa Indonesia' : (isEnglish ? 'English' : 'Bahasa Indonesia (default)');
  
  const langNote = `\n🚨🚨🚨 PENTING SEKALI - BAHASA RESPONS (WAJIB DIPATUHI): 🚨🚨🚨
- User bertanya dalam: ${detectedLanguage}
- KAMU HARUS menjawab dalam ${detectedLanguage} yang SAMA
- JANGAN gunakan bahasa lain selain ${detectedLanguage}
- Jika user bertanya dalam Bahasa Indonesia → jawab 100% dalam Bahasa Indonesia
- Jika user bertanya dalam English → jawab 100% dalam English
- Ini adalah ATURAN WAJIB yang TIDAK BOLEH dilanggar`;
  
  const assetTypeLabel = assetType === 'crypto' ? 'kripto' : 'saham';
  const assetTypeLabelUpper = assetType === 'crypto' ? 'KRIPTO' : 'SAHAM';
  return `Kamu adalah AI Assistant untuk analisis pasar ${assetTypeLabel}.${langNote}

━━━━━━━━━━━━━━━━━━━━━━
MODE: MODE_MARKET_ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━

PENTING - JENIS ASET:
- Aset yang sedang dianalisis adalah ${assetTypeLabel.toUpperCase()} (${assetTypeLabelUpper}), BUKAN ${assetType === 'crypto' ? 'saham' : 'kripto'}.
- Gunakan terminologi yang tepat: ${assetType === 'crypto' ? '"kripto", "cryptocurrency", "koin"' : '"saham", "stock", "equity"'}.
- JANGAN menyebut ini sebagai ${assetType === 'crypto' ? 'saham' : 'kripto'}.
- Dalam header/judul, gunakan: "ANALISIS TEKNIKAL ${assetTypeLabelUpper}" bukan "ANALISIS TEKNIKAL ${assetType === 'crypto' ? 'SAHAM' : 'KRIPTO'}".

ATURAN WAJIB:
1. Gunakan HANYA data OHLC, volume, dan timeframe yang diberikan di bawah ini.
2. TIDAK mengakses data real-time atau data di luar yang diberikan.
3. TIDAK memberikan sinyal BUY/SELL absolut. Gunakan probabilitas, bukan kepastian.
4. Jangan mengarang data, harga, atau fakta.
5. Jika data tidak cukup → tolak analisis dan minta data tambahan.
6. Pisahkan dengan jelas: FAKTA, ANALISIS, dan ASUMSI.
7. Output bersifat informatif, bukan keputusan final.
8. SELALU sebutkan bahwa ini adalah analisis ${assetTypeLabel}, bukan ${assetType === 'crypto' ? 'saham' : 'kripto'}.

DATA YANG DIGUNAKAN:
${preprocessed.formattedForLLM}

INDIKATOR TEKNIS:
- RSI: ${indicators.rsi !== null ? indicators.rsi.toFixed(2) : 'N/A'} ${indicators.rsi !== null ? (indicators.rsi > 70 ? '(Overbought)' : indicators.rsi < 30 ? '(Oversold)' : '(Neutral)') : '(Data tidak cukup)'}
- MA20: ${indicators.ma20 !== null ? indicators.ma20.toFixed(2) : 'N/A'}
- Trend: ${indicators.trend}
- Harga saat ini: ${marketData.currentPrice || 'N/A'}
- Perubahan 24h: ${marketData.change24h !== undefined ? `${marketData.change24h.toFixed(2)}%` : 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━
FORMAT WAJIB OUTPUT:
━━━━━━━━━━━━━━━━━━━━━━

1. DATA YANG DIGUNAKAN
   - Timeframe: [sebutkan]
   - Jumlah data points: [sebutkan]
   - Rentang waktu: [dari - sampai]
   - Sumber data: [OHLC yang diberikan]

2. FAKTA DARI DATA
   - Harga tertinggi: [dari data]
   - Harga terendah: [dari data]
   - Rata-rata harga: [dari data]
   - Volatilitas: [dari data]
   - Indikator yang terhitung: [sebutkan yang valid]

3. ANALISIS TEKNIKAL
   - Interpretasi trend: [bullish/bearish/sideways] dengan alasan berdasarkan data
   - Pola candlestick: [pola yang terdeteksi dari data, jika ada]
   - Level support & resistance: [berdasarkan data, jika bisa diidentifikasi]
   - Analisis indikator: [RSI, MA20, dll berdasarkan nilai yang ada]

4. SKENARIO KEMUNGKINAN
   - Skenario 1: [kemungkinan dengan probabilitas, bukan kepastian]
   - Skenario 2: [alternatif kemungkinan]
   - Gunakan kata: "kemungkinan", "probabilitas", "berpotensi", BUKAN "pasti", "akan", "harus"

5. RISIKO & KETERBATASAN
   - Risiko yang teridentifikasi: [sebutkan]
   - Keterbatasan analisis: [data yang kurang, asumsi yang digunakan]
   - Disclaimer: Analisis ini berdasarkan data historis, bukan jaminan

6. KESIMPULAN SINGKAT
   - Ringkasan 1-2 kalimat
   - TIDAK memberikan rekomendasi BUY/SELL absolut
   - Gunakan bahasa: "dapat dipertimbangkan", "perlu monitoring", "hati-hati dengan", dll

━━━━━━━━━━━━━━━━━━━━━━
JIKA DATA TIDAK CUKUP:
━━━━━━━━━━━━━━━━━━━━━━

Jika data kurang untuk analisis yang valid, jawab:
"Data tidak cukup untuk analisis teknikal yang valid. Mohon berikan data OHLC yang lebih lengkap dengan timeframe yang jelas."

━━━━━━━━━━━━━━━━━━━━━━
CATATAN PENTING:
━━━━━━━━━━━━━━━━━━━━━━

- JANGAN mengarang harga atau data yang tidak ada
- JANGAN memberikan sinyal trading absolut (BUY/SELL pasti)
- GUNAKAN probabilitas dan kemungkinan
- PISAHKAN fakta dari analisis dan asumsi
- OUTPUT informatif, bukan keputusan final

⚠️ INGAT: User bertanya dalam ${detectedLanguage}. Jawab dalam ${detectedLanguage} yang SAMA. JANGAN gunakan bahasa lain!

⚠️⚠️⚠️ PENTING - JANGAN ULANG ATURAN PROMPT:
- JANGAN menulis kembali atau mengutip aturan-aturan di atas dalam respons kamu
- JANGAN menampilkan instruksi seperti "🚨🚨🚨 PENTING SEKALI - BAHASA RESPONS" atau aturan lainnya
- JANGAN menjelaskan bahwa kamu mengikuti aturan tertentu
- Langsung jawab pertanyaan user dengan natural, seolah-olah aturan tersebut sudah otomatis diterapkan
- User tidak perlu tahu tentang aturan internal yang kamu gunakan`;
}

function isComparisonRequest(message: string): boolean {
  const msg = (message || '').toLowerCase();
  const keywords = [
    'bandingkan',
    'perbandingan',
    'compare',
    'comparison',
    'vs',
    'versus',
    'dibandingkan',
    'banding',
    'komparasi',
    'komparasi',
    'perbanding',
  ];
  
  // Check for explicit comparison keywords
  if (keywords.some((k) => msg.includes(k))) {
    return true;
  }
  
  // Check for multiple symbols pattern (e.g., "btc eth", "btc dan eth", "btc, eth")
  const multipleSymbolPatterns = [
    /\b(btc|eth|sol|bnb|ada|xrp|dot|matic|avax|doge|ltc|link|atom|trx)\b.*\b(btc|eth|sol|bnb|ada|xrp|dot|matic|avax|doge|ltc|link|atom|trx)\b/i,
    /\b(btc|eth|sol|bnb|ada|xrp|dot|matic|avax|doge|ltc|link|atom|trx)\s+(dan|and|&|,)\s+(btc|eth|sol|bnb|ada|xrp|dot|matic|avax|doge|ltc|link|atom|trx)\b/i,
  ];
  
  return multipleSymbolPatterns.some((pattern) => pattern.test(message));
}

function formatPct(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatUsd(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return `$${value.toFixed(2)}`;
}

function normalizeSeriesTo100(points: Array<{ time: string; close: number }>): Array<{ time: string; value: number }> {
  if (!points.length) return [];
  const base = points[0].close || 1;
  return points.map((p) => ({ time: p.time, value: (p.close / base) * 100 }));
}

function buildComparisonFallbackAnalysis(rows: Array<Record<string, any>>, days: number, assetType: 'crypto' | 'stock' = 'crypto'): string {
  const assetTypeLabel = assetType === 'crypto' ? 'KRIPTO' : 'SAHAM';
  const header = `━━━━━━━━━━━━━━━━━━━━━━
PERBANDINGAN ${assetTypeLabel} (${days} hari)
━━━━━━━━━━━━━━━━━━━━━━`;

  const body = rows
    .map((r) => {
      return `
${r.Symbol}
- Harga: ${r['Harga'] || r['Harga (USD)'] || 'N/A'}
- 24h: ${r['Perubahan 24h']}
- Return periode: ${r['Return Periode']}
- Trend: ${r['Trend']}
- RSI: ${r['RSI']}
- MA20: ${r['MA20']}`;
    })
    .join('\n');

  const footer = `

Catatan:
- Return periode dihitung dari close candle pertama ke close candle terakhir (dinormalisasi).
- Ini analisis teknikal berbasis data historis; bukan jaminan pergerakan harga ke depan.`;

  return `${header}\n${body}\n${footer}`;
}

async function processMarketComparison(context: AIRequestContext): Promise<AIRequestResponse> {
  const message = context.message || '';
  
  // ✅ STEP 1: Try to parse function call from message (if LLM already processed it)
  // This allows LLM to call display_comparison_chart function
  let functionCall = parseFunctionCall(message);
  
  // ✅ STEP 2: If no function call, try to extract symbols directly
  const symbols = functionCall?.name === 'display_comparison_chart' 
    ? functionCall.arguments.symbols.map((s: string) => ({ 
        symbol: s, 
        type: (functionCall.arguments.asset_type || 'stock') as 'crypto' | 'stock' 
      }))
    : extractMultipleSymbols(message);
  
  const candidates = extractCandidateTokens(message);

  // If old extractor didn't find enough, try resolving by name/symbol using real APIs (no sample data)
  let resolvedList: Array<{ symbol: string; type: 'crypto' | 'stock'; coinId?: string }> = symbols.map((s: { symbol: string; type: 'crypto' | 'stock' }) => ({ symbol: s.symbol, type: s.type }));

  if (resolvedList.length < 2 && candidates.length >= 2) {
    const resolved = await Promise.all(
      candidates.slice(0, 5).map(async (c) => {
        // Try crypto then stock; we keep whichever resolves first
        const cr = await resolveCrypto(c).catch(() => null);
        if (cr && cr.type === 'crypto') return { symbol: cr.symbol, type: 'crypto' as const, coinId: cr.coinId };
        const st = await resolveStock(c).catch(() => null);
        if (st && st.type === 'stock') return { symbol: st.symbol, type: 'stock' as const };
        return null;
      })
    );

    resolvedList = resolved.filter(Boolean) as any;
  }

  if (resolvedList.length < 2) {
    return {
      success: false,
      mode: RequestMode.MARKET_ANALYSIS,
      error: 'Butuh minimal 2 aset untuk dibandingkan. Coba tulis simbolnya jelas (contoh: BBCA, BBRI, BBNI atau BTC, ETH, SOL).',
    };
  }

  // Determine days using existing parser or function call
  const marketInfo = isMarketDataRequest(message);
  let days = marketInfo.days || 7;
  
  // ✅ Convert timeframe from function call to days if available
  if (functionCall?.arguments?.timeframe) {
    const timeframeStr = functionCall.arguments.timeframe;
    const timeframeMapping: Record<string, number> = {
      '1D': 1,
      '5D': 5,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      '5Y': 1825,
      'MAX': 3650,
    };
    days = timeframeMapping[timeframeStr] || days;
  }

  // For now, only compare same asset type group (all crypto OR all stock)
  const types = new Set(resolvedList.map((s) => s.type));
  if (types.size > 1) {
    return {
      success: false,
      mode: RequestMode.MARKET_ANALYSIS,
      error: 'Perbandingan lintas tipe (crypto vs stock) belum didukung. Mohon bandingkan sesama crypto atau sesama stock.',
    };
  }

  const type = resolvedList[0].type;

  // ✅ OPTIMIZED: Parallel fetching for stocks, sequential for crypto (rate limit)
  const fetched: Array<{ symbol: string; marketData: any; indicators: any; preprocessed: any }> = [];
  
  if (type === 'stock') {
    // 🚀 PARALLEL FETCHING for stocks (Yahoo Finance is more tolerant, with cache)
    console.log(`📡 [Comparison] Fetching ${resolvedList.length} stocks in parallel (with cache)...`);
    const fetchPromises = resolvedList.map(async ({ symbol }, index) => {
      try {
        console.log(`📡 [Comparison] Fetching data for ${symbol} (${index + 1}/${resolvedList.length})...`);
        // fetchStockData already uses cache internally
        const marketData = await fetchStockData(symbol, days);
        const indicators = calculateIndicators(marketData.data);
        const preprocessed = preprocessCandlestick(marketData, indicators);
        console.log(`✅ [Comparison] Successfully fetched data for ${symbol}`);
        return { symbol: marketData.symbol, marketData, indicators, preprocessed };
      } catch (error: any) {
        console.error(`❌ Error fetching data for ${symbol}:`, error);
        if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
          throw new Error(`Timeout saat mengambil data untuk ${symbol}. Koneksi internet mungkin lambat atau server sedang sibuk. Silakan coba lagi.`);
        }
        throw new Error(`Gagal mengambil data untuk ${symbol}: ${error.message || 'Unknown error'}`);
      }
    });
    
    // Wait for all stock fetches to complete in parallel
    const results = await Promise.all(fetchPromises);
    fetched.push(...results);
  } else {
    // ⚠️ SEQUENTIAL FETCHING for crypto (to avoid CoinGecko rate limit 429)
    console.log(`📡 [Comparison] Fetching ${resolvedList.length} cryptos sequentially (rate limit protection)...`);
    for (let i = 0; i < resolvedList.length; i++) {
      const { symbol } = resolvedList[i];
      try {
        // Add delay between requests for crypto to avoid rate limit (429)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay for crypto
        }
        
        console.log(`📡 [Comparison] Fetching data for ${symbol} (${i + 1}/${resolvedList.length})...`);
        const marketData = await fetchCryptoData(symbol, days);
        const indicators = calculateIndicators(marketData.data);
        const preprocessed = preprocessCandlestick(marketData, indicators);
        fetched.push({ symbol: marketData.symbol, marketData, indicators, preprocessed });
        console.log(`✅ [Comparison] Successfully fetched data for ${symbol}`);
      } catch (error: any) {
        console.error(`❌ Error fetching data for ${symbol}:`, error);
        // If rate limit error, throw with helpful message
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          throw new Error(`Rate limit CoinGecko (429). Terlalu banyak request. Coba lagi dalam beberapa saat.`);
        }
        // If timeout error, provide helpful message
        if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
          throw new Error(`Timeout saat mengambil data untuk ${symbol}. Koneksi internet mungkin lambat atau server sedang sibuk. Silakan coba lagi.`);
        }
        // For other errors, throw with original message
        throw new Error(`Gagal mengambil data untuk ${symbol}: ${error.message || 'Unknown error'}`);
      }
    }
  }

  // Build table rows
  const tableRows = fetched.map(({ symbol, marketData, indicators, preprocessed }) => {
    const closes = marketData.data.map((d: any) => d.close);
    const first = closes[0] || 1;
    const last = closes[closes.length - 1] || first;
    const periodReturn = ((last - first) / first) * 100;

    const priceRange = preprocessed?.summary?.priceRange;
    const vol = preprocessed?.summary?.volatility;

    return {
      Symbol: symbol,
      Harga: formatUsd(marketData.currentPrice ?? last),
      'Perubahan 24h': formatPct(marketData.change24h),
      'Return Periode': formatPct(periodReturn),
      Trend: indicators.trend,
      RSI: indicators.rsi !== null ? indicators.rsi.toFixed(2) : 'N/A',
      MA20: indicators.ma20 !== null ? indicators.ma20.toFixed(2) : 'N/A',
      Support: priceRange?.min ? formatUsd(priceRange.min) : 'N/A',
      Resistance: priceRange?.max ? formatUsd(priceRange.max) : 'N/A',
      Volatilitas: typeof vol === 'number' ? `${vol.toFixed(2)}%` : 'N/A',
      'Data Points': marketData.data.length,
    };
  });

  // Build comparison chart (normalized performance index = 100)
  const seriesPoints = fetched.map(({ symbol, marketData }) => ({
    symbol,
    points: marketData.data.map((d: any) => ({ time: d.time, close: d.close })),
  }));

  // Use intersection of timestamps so the chart aligns cleanly
  let commonTimes = new Set<string>(seriesPoints[0].points.map((p: any) => p.time));
  for (const s of seriesPoints.slice(1)) {
    const set = new Set<string>(s.points.map((p: any) => p.time));
    commonTimes = new Set<string>(Array.from(commonTimes).filter((t) => set.has(t)));
  }

  const sortedTimes = Array.from<string>(commonTimes).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const valueBySymbolAndTime: Record<string, Record<string, number>> = {};
  for (const s of seriesPoints) {
    const normalized = normalizeSeriesTo100(s.points.filter((p: any) => commonTimes.has(p.time)));
    valueBySymbolAndTime[s.symbol] = Object.fromEntries(normalized.map((p: any) => [p.time, p.value]));
  }

  const chartData = sortedTimes.map((t) => {
    const row: Record<string, any> = { time: new Date(t).toLocaleDateString('id-ID') };
    for (const sym of Object.keys(valueBySymbolAndTime)) {
      row[sym] = valueBySymbolAndTime[sym][t];
    }
    return row;
  });

  // Build comparison assets info for widget
  // Logo menggunakan API endpoint /api/logo untuk konsistensi
  const comparisonAssets = fetched.map(({ symbol, marketData }, index) => {
    const priceRange = fetched[index]?.preprocessed?.summary?.priceRange;
    const firstPrice = marketData.data[0]?.close || marketData.currentPrice || 0;
    const lastPrice = marketData.data[marketData.data.length - 1]?.close || marketData.currentPrice || 0;
    const change = lastPrice - firstPrice;
    const changePercent = firstPrice !== 0 ? ((change / firstPrice) * 100) : 0;

    return {
      symbol: symbol,
      name: (marketData as any).companyName || undefined, // Nama perusahaan langsung dari API
      logo: `/api/logo?symbol=${encodeURIComponent(symbol)}&type=${type}`, // Logo menggunakan API endpoint /api/logo
      exchange: type === 'stock' ? 'NASDAQ' : undefined, // Default exchange
      currentPrice: marketData.currentPrice ?? lastPrice,
      change: change,
      changePercent: changePercent,
      timestamp: new Date().toLocaleString('id-ID'),
    };
  });

  // Determine timeframe label from days or use provided timeframe
  const getTimeframeLabel = (daysOrTimeframe: number | string): string => {
    if (typeof daysOrTimeframe === 'string') {
      return daysOrTimeframe; // Already a timeframe string
    }
    const days = daysOrTimeframe;
    if (days <= 1) return '1D';
    if (days <= 5) return '5D';
    if (days <= 30) return '1M';
    if (days <= 180) return '6M';
    if (days <= 365) return '1Y';
    if (days <= 1825) return '5Y';
    return 'MAX';
  };
  
  // Convert timeframe string to days for API calls
  const timeframeToDays = (timeframe: string): number => {
    const mapping: Record<string, number> = {
      '1D': 1,
      '5D': 5,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      '5Y': 1825,
      'MAX': 3650,
    };
    return mapping[timeframe] || 365; // Default to 1Y
  };

  // Get timeframe string for chart
  const timeframeStr = functionCall?.arguments?.timeframe || getTimeframeLabel(days);
  
  const chart = {
    type: 'comparison' as const,
    title: `Perbandingan Performa - ${timeframeStr}`,
    data: chartData,
    xKey: 'time',
    yKey: fetched.map((f) => f.symbol),
    comparisonAssets: comparisonAssets,
    asset_type: type, // Add asset type for logo fetching
    timeframe: timeframeStr, // Add timeframe for widget
  };

  const table = {
    title: `Ringkasan Perbandingan (${days} hari)`,
    data: tableRows,
  };

  // Optional: ask LLM to write narrative comparison; fallback if it fails.
  let responseText = buildComparisonFallbackAnalysis(tableRows, days, type);
  try {
    const llmProvider = getLLMProvider();
    const globalRules = getGlobalPromptRules();
    // Detect language from user message
    const userMessage = message; // Use message from context
    const isIndonesian = userMessage ? /[aku|saya|kamu|gimana|bagaimana|tolong|bisa|mau|ingin|punya|dengan|untuk|biar|jelasin|jelaskan|dasar|teori|budget|juta|marketing|alokasi|efektif|tampilkan|chart|grafik|analisis|bandingkan|perbandingan]/i.test(userMessage) : true;
    const isEnglish = userMessage ? /^[a-zA-Z\s.,!?'"-]+$/.test(userMessage.trim().substring(0, 100)) : false;
    const detectedLanguage = isIndonesian ? 'Bahasa Indonesia' : (isEnglish ? 'English' : 'Bahasa Indonesia (default)');
    
    const assetTypeLabel = type === 'crypto' ? 'kripto' : 'saham';
    const assetTypeLabelUpper = type === 'crypto' ? 'KRIPTO' : 'SAHAM';
    
    // ✅ CRITICAL: Prepare actual data from API for grounding
    const actualDataSummary = fetched.map(({ symbol, marketData, indicators }) => ({
      symbol,
      currentPrice: marketData.currentPrice,
      change24h: marketData.change24h,
      rsi: indicators.rsi,
      ma20: indicators.ma20,
      trend: indicators.trend,
      dataPoints: marketData.data.length,
      firstPrice: marketData.data[0]?.close,
      lastPrice: marketData.data[marketData.data.length - 1]?.close,
    }));
    
    // ✅ CRITICAL: Extract chart data points for AI (for reference only, chart already built from API)
    const chartDataPoints = chartData.slice(-20).map((row: any) => {
      const point: any = { time: row.time };
      fetched.forEach(({ symbol }) => {
        point[symbol] = row[symbol] || null;
      });
      return point;
    });
    
    // ✅ FUNCTION CALLING PROMPT: Include function definitions
    const functionDefinitions = formatFunctionsForPrompt();
    
    // Get timeframe string for prompt
    const timeframeStr = functionCall?.arguments?.timeframe || getTimeframeLabel(days);
    
    const prompt = `🚨🚨🚨 ATURAN KERAS - WAJIB DIPATUHI: 🚨🚨🚨

Kamu adalah API, BUKAN penulis artikel.

BALAS HANYA DALAM FORMAT JSON VALID.
DILARANG menulis paragraf, heading, atau markdown.
DILARANG menulis teks di luar JSON.

Struktur WAJIB (TIDAK BOLEH BERUBAH):
{
  "summary": "string - ringkasan singkat 2-3 kalimat",
  "analysis": {
    "winner": "string - simbol dengan performa terbaik",
    "rsi_comparison": "string - perbandingan RSI",
    "trend_analysis": "string - analisis trend",
    "scenarios": [
      {
        "name": "string - nama skenario",
        "probability": "string - probabilitas",
        "description": "string - deskripsi"
      }
    ],
    "recommendations": [
      "string - saran 1",
      "string - saran 2",
      "string - saran 3"
    ],
    "risks": "string - risiko dan batasan"
  }
}

⚠️ PENTING:
- Jika data tidak tersedia, gunakan null (BUKAN string "N/A" atau "tidak ada")
- JANGAN menambahkan field di luar struktur di atas
- JANGAN menulis teks sebelum atau sesudah JSON
- Output HARUS valid JSON yang bisa di-parse

DATA REAL DARI API (JANGAN NEBAK):
${JSON.stringify(actualDataSummary, null, 2)}

TABEL RINGKASAN:
${JSON.stringify(tableRows, null, 2)}

CHART DATA POINTS (untuk referensi, chart sudah dibuat dari API):
${JSON.stringify(chartDataPoints, null, 2)}

FUNGSI YANG TERSEDIA (untuk referensi):
${functionDefinitions}

CATATAN PENTING:
- Chart sudah dibuat dari data API di atas, kamu TIDAK perlu membuat chart
- Kamu hanya perlu menganalisis data yang diberikan sesuai dengan permintaan user
- Respon HARUS sesuai dengan yang user minta - jika user minta analisis singkat, berikan analisis singkat
- Jika user minta analisis detail, berikan analisis detail
- Output HARUS dalam format JSON sesuai struktur di atas
- JANGAN membuat chart atau visualisasi tambahan - cukup analisis data

Permintaan User: "${message}"

Bahasa respons: ${detectedLanguage}
Jenis aset: ${assetTypeLabel.toUpperCase()} (${assetTypeLabelUpper})
Timeframe: ${timeframeStr}
Jumlah simbol: ${fetched.length} (1 comparison chart akan dibuat)

INGAT: 
- Kamu adalah API. Output JSON saja. Tidak ada teks lain.
- HANYA 1 comparison chart yang akan dibuat untuk ${fetched.length} simbol ini
- Logo untuk chart akan diambil dari API endpoint /api/logo
- Respon sesuai dengan permintaan user
- Jangan membuat chart tambahan atau visualisasi`;

    // ✅ CRITICAL: Force JSON output format
    const llm = await llmProvider.generateResponse(
      [
        { role: 'system', content: `${globalRules}\n\n${prompt}` },
        { role: 'user', content: message },
      ],
      { 
        temperature: 0.3, // Lower temperature for more structured output
        format: 'json' // Force JSON format if supported
      }
    );

    // ✅ CRITICAL: Parse and validate JSON response
    let parsedAnalysis: any = null;
    if (llm && llm.trim().length > 50) {
      try {
        // Try to extract JSON from response (in case LLM adds extra text)
        const jsonMatch = llm.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : llm.trim();
        
        parsedAnalysis = JSON.parse(jsonString);
        
        // Validate structure
        if (!parsedAnalysis.summary || !parsedAnalysis.analysis) {
          throw new Error('Invalid JSON structure');
        }
        
        // Build response text from parsed JSON
        const parts: string[] = [];
        if (parsedAnalysis.summary) parts.push(parsedAnalysis.summary);
        if (parsedAnalysis.analysis?.winner) {
          parts.push(`\n\n**Pemenang Performa:** ${parsedAnalysis.analysis.winner}`);
        }
        if (parsedAnalysis.analysis?.rsi_comparison) {
          parts.push(`\n\n**Perbandingan RSI:** ${parsedAnalysis.analysis.rsi_comparison}`);
        }
        if (parsedAnalysis.analysis?.trend_analysis) {
          parts.push(`\n\n**Analisis Trend:** ${parsedAnalysis.analysis.trend_analysis}`);
        }
        if (parsedAnalysis.analysis?.scenarios?.length > 0) {
          parts.push(`\n\n**Skenario:**`);
          parsedAnalysis.analysis.scenarios.forEach((s: any) => {
            parts.push(`- ${s.name} (${s.probability}): ${s.description}`);
          });
        }
        if (parsedAnalysis.analysis?.recommendations?.length > 0) {
          parts.push(`\n\n**SARAN:**`);
          parsedAnalysis.analysis.recommendations.forEach((r: string) => {
            parts.push(`- ${r}`);
          });
        }
        if (parsedAnalysis.analysis?.risks) {
          parts.push(`\n\n**Risiko & Batasan:** ${parsedAnalysis.analysis.risks}`);
        }
        
        responseText = parts.join('');
        console.log('✅ [Market Handler] Successfully parsed JSON response from LLM');
      } catch (parseError: any) {
        console.warn('⚠️ [Market Handler] Failed to parse LLM JSON response:', parseError.message);
        console.warn('⚠️ Raw LLM response (first 500 chars):', llm.substring(0, 500));
        // Fallback to original response if JSON parsing fails
        responseText = llm;
      }
    }
  } catch (e: any) {
    console.warn('⚠️ [Market Handler] LLM comparison narrative failed, using fallback:', e?.message);
  }

  return {
    success: true,
    mode: RequestMode.MARKET_ANALYSIS,
    response: responseText,
    structuredOutput: {
      action: 'text_only',
      message: responseText,
    },
    marketData: {
      type,
      days,
      symbols: fetched.map((f) => f.symbol),
    },
    indicators: undefined,
    chart,
    table,
  };
}

/**
 * Process Market Analysis Request
 */
export async function processMarketAnalysis(
  context: AIRequestContext
): Promise<AIRequestResponse> {
  try {
    console.log('📊 [Market Handler] Processing market analysis request...');

    // Multi-symbol comparison (BTC vs ETH, etc.)
    // Check comparison request FIRST before single symbol processing
    const message = context.message || '';
    const isComparison = isComparisonRequest(message);
    const multi = extractMultipleSymbols(message);
    
    console.log('📊 [Market Handler] Checking comparison:', { 
      isComparison, 
      multiCount: multi.length, 
      symbols: multi.map(m => m.symbol),
      message 
    });
    
    if (multi.length >= 2 || (isComparison && multi.length >= 1)) {
      // If comparison keyword detected but only 1 symbol found, try to extract more
      if (isComparison && multi.length === 1) {
        console.log('⚠️ [Market Handler] Comparison keyword detected but only 1 symbol found, trying to extract more...');
        // The processMarketComparison will try to resolve more symbols using extractCandidateTokens
      }
      
      if (multi.length >= 2 || isComparison) {
        console.log('📊 [Market Handler] Detected comparison request:', multi);
        return await processMarketComparison(context);
      }
    }

    // Extract market information from message
    const marketInfo = isMarketDataRequest(context.message || '');
    
    if (!marketInfo.isMarket || !marketInfo.symbol) {
      return {
        success: false,
        mode: RequestMode.MARKET_ANALYSIS,
        error: 'Market symbol not detected in request',
      };
    }

    const { symbol, type = 'crypto', days = 7 } = marketInfo;

    // Step 1: Fetch market data
    console.log(`📡 [Market Handler] Step 1: Fetching ${type} data for ${symbol}...`);
    let marketData;
    try {
      if (type === 'crypto') {
        marketData = await fetchCryptoData(symbol, days);
      } else {
        marketData = await fetchStockData(symbol, days);
      }
      console.log(`✅ [Market Handler] Data fetched: ${marketData.data.length} data points`);
    } catch (fetchError: any) {
      console.error('❌ [Market Handler] Fetch error:', fetchError.message);
      return {
        success: false,
        mode: RequestMode.MARKET_ANALYSIS,
        error: `Failed to fetch market data: ${fetchError.message}`,
      };
    }

    // Step 2: Data Validator (OHLC)
    console.log('🔍 [Market Handler] Step 2: Validating OHLC data...');
    const validation = validateOHLCData(marketData.data);
    if (!validation.valid) {
      console.error('❌ [Market Handler] Data validation failed:', validation.errors);
      return {
        success: false,
        mode: RequestMode.MARKET_ANALYSIS,
        error: `Data validation failed: ${validation.errors.join(', ')}`,
      };
    }
    console.log('✅ [Market Handler] OHLC data validated');

    // Step 3: Indicator Engine
    const indicators = runIndicatorEngine(marketData.data);

    // Step 4: Preprocess candlestick data
    console.log('🔄 [Market Handler] Step 4: Preprocessing candlestick data...');
    const preprocessed = preprocessCandlestick(marketData, indicators);
    console.log('✅ [Market Handler] Data preprocessed');

    // Step 5: LLaMA Analysis with Tech Prompt
    console.log('🤖 [Market Handler] Step 5: Requesting LLM analysis...');
    const llmProvider = getLLMProvider();
    
    // Use structured prompt for chart generation if needed
    const structuredPrompt = getStructuredPrompt(true, symbol, type, marketInfo.chartType);
    const techPrompt = getTechPrompt(marketData, indicators, preprocessed, type, context.message);
    const globalRules = getGlobalPromptRules();

    // Simplify prompt - prioritize tech analysis over structured output
    // Use tech prompt as primary, structured prompt only for JSON format guidance
    // Pastikan AI hanya membuat 1 chart sesuai permintaan user dan respon sesuai permintaan
    const userRequest = context.message || `Analisis ${symbol}`;
    const systemPrompt = `${globalRules}\n\n${techPrompt}\n\n---\n\n${structuredPrompt}\n\n⚠️ PENTING - ATURAN CHART & RESPON:
- User meminta: "${userRequest}"
- Buat HANYA 1 chart untuk simbol: ${symbol} (TIDAK lebih dari 1 chart)
- Respon HARUS sesuai dengan permintaan user di atas
  * Jika user minta analisis singkat → berikan analisis singkat (1-2 paragraf)
  * Jika user minta analisis detail → berikan analisis detail (lengkap)
  * Jika user hanya minta chart → berikan penjelasan singkat + chart
- JANGAN membuat chart tambahan atau multiple chart
- Logo untuk chart akan diambil dari API endpoint /api/logo`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userRequest,
      },
    ];

    let llmResponse: string;
    let structuredOutput: any = null;
    
    // Helper function to detect placeholder/invalid messages
    const isValidAnalysisMessage = (message: string): boolean => {
      if (!message || message.length < 200) return false;
      
      // List of placeholder patterns to detect
      const placeholderPatterns = [
        /ANALISIS LENGKAP.*WAJIB DIISI/i,
        /DISINI.*WAJIB/i,
        /LENGKAP.*DISINI/i,
        /WAJIB DIISI/i,
        /ANALISIS.*DISINI/i,
        /isi.*disini/i,
        /fill.*here/i,
        /complete.*here/i,
        /analysis.*here/i,
      ];
      
      // Check if message contains placeholder text
      for (const pattern of placeholderPatterns) {
        if (pattern.test(message)) {
          console.warn('⚠️ [Market Handler] Detected placeholder text in LLM response');
          return false;
        }
      }
      
      // Check if message contains actual analysis keywords
      const analysisKeywords = [
        'data yang digunakan',
        'fakta dari data',
        'analisis teknikal',
        'skenario',
        'risiko',
        'kesimpulan',
        'trend',
        'rsi',
        'ma20',
        'support',
        'resistance',
        'probabilitas',
        'kemungkinan',
      ];
      
      const messageLower = message.toLowerCase();
      const keywordCount = analysisKeywords.filter(keyword => 
        messageLower.includes(keyword)
      ).length;
      
      // Must have at least 3 analysis keywords to be considered valid
      return keywordCount >= 3;
    };
    
    try {
      llmResponse = await llmProvider.generateResponse(messages, {
        temperature: 0.7,
        format: 'json', // Force JSON for structured output
      });
      console.log('✅ [Market Handler] LLM analysis completed');
      console.log('📝 [Market Handler] Raw LLM response length:', llmResponse.length);
      
      // Parse JSON response
      try {
        const parsed = JSON.parse(llmResponse.trim());
        structuredOutput = parsed;
        
        // Extract message from structured output
        // Validate message before using it
        if (parsed.message && isValidAnalysisMessage(parsed.message)) {
          console.log('✅ [Market Handler] Using LLM-generated analysis');
          llmResponse = parsed.message;
        } else {
          console.warn('⚠️ [Market Handler] LLM message invalid or too short, using fallback');
          // Build comprehensive analysis from data
          llmResponse = buildTechnicalAnalysis(marketData, indicators, preprocessed, symbol, type);
        }
      } catch (parseError) {
        console.warn('⚠️ [Market Handler] Failed to parse JSON, using fallback');
        // If JSON parse fails, always use fallback
        llmResponse = buildTechnicalAnalysis(marketData, indicators, preprocessed, symbol, type);
      }
    } catch (llmError: any) {
      console.error('⚠️ [Market Handler] LLM analysis failed:', llmError.message);
      // Build fallback analysis from indicators
      llmResponse = buildTechnicalAnalysis(marketData, indicators, preprocessed, symbol, type);
    }

    // Step 6: Chart sudah di-handle oleh structuredOutput
    // Frontend akan membuat chart berdasarkan structuredOutput.action === 'show_chart'
    // Tidak perlu generate chart lagi di sini untuk menghindari duplicate chart
    let chart = null;

    // Ensure structuredOutput.message is always valid
    // structuredOutput akan membuat 1 chart sesuai dengan symbol yang diminta user
    if (structuredOutput) {
      structuredOutput.message = llmResponse; // Always use validated llmResponse
      // Pastikan structuredOutput hanya membuat 1 chart untuk symbol yang diminta
      structuredOutput.symbol = symbol;
      structuredOutput.asset_type = type;
    } else {
      // Jika tidak ada structuredOutput, buat untuk single chart
      structuredOutput = {
        action: 'show_chart',
        symbol: symbol, // 1 chart untuk 1 symbol
        asset_type: type,
        message: llmResponse,
      };
    }

    return {
      success: true,
      mode: RequestMode.MARKET_ANALYSIS,
      response: llmResponse,
      structuredOutput: structuredOutput,
      marketData: {
        symbol: marketData.symbol,
        currentPrice: marketData.currentPrice,
        change24h: marketData.change24h,
        dataPoints: marketData.data.length,
      },
      indicators,
      chart,
    };
  } catch (error: any) {
    console.error('❌ [Market Handler] Error processing market analysis:', error);
    return {
      success: false,
      mode: RequestMode.MARKET_ANALYSIS,
      error: error.message || 'Failed to process market analysis',
    };
  }
}
