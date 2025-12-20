// AI Request Router - Centralized routing system for different AI request modes
// Routes requests to appropriate handlers based on mode detection

import { getLLMProvider } from './providers';
import { isMarketDataRequest } from './chart-generator';
import { processMarketAnalysis } from './handlers/market-analysis-handler';
import { processBusinessAdmin } from './handlers/business-admin-handler';
import { processLetterGenerator } from './handlers/letter-generator-handler';
import { processReportGenerator } from './handlers/report-generator-handler';

/**
 * Global prompt rules that apply to all modes
 * @param language - The detected language code ('id' or 'en')
 */
export function getGlobalPromptRules(language: 'id' | 'en' = 'en'): string {
  const isID = language === 'id';
  
  if (isID) {
    return `SISTEM INSTRUKSI (PENTING):

1. BAHASA (KRITIS):
   - User berbicara dalam Bahasa Indonesia.
   - Kamu WAJIB menjawab 100% dalam BAHASA INDONESIA yang luwes dan profesional.
   - JANGAN gunakan bahasa Inggris kecuali untuk istilah teknis yang mendesak.

2. ESTETIKA & FORMAT RESPONS (PENTING):
   - JUDUL: Gunakan **Teks Tebal** untuk judul bagian atau poin utama.
   - NARASI: Tulis dalam paragraf yang mengalir dan enak dibaca.
   - POIN: Gunakan poin angka (1., 2.) atau bullet (-) hanya jika sangat diperlukan untuk langkah-langkah.
   - SIMBOL: JANGAN gunakan simbol dekoratif aneh (━, •, ▸, ●, ★, 📊). Cukup teks bersih.
   - JANGAN gunakan heading markdown (###) di setiap paragraf.
   - PENTING: JANGAN PERNAH menampilkan blok kode JSON atau raw data teknis kepada user. Biarkan sistem yang mengolahnya.

3. TANGGUNG JAWAB:
   - Berikan jawaban yang akurat berdasarkan data yang tersedia.
   - Jika data tidak ada, jangan mengarang.
   - Pisahkan fakta dari opini/analisis.

4. KEMAMPUAN:
   - Gunakan data dokumen (RAG) jika tersedia.
   - Sarankan visualisasi grafik jika ada tren angka yang signifikan.`;
  }

  return `SYSTEM INSTRUCTIONS:

1. LANGUAGE (CRITICAL):
   - User is speaking ENGLISH.
   - Respond ENTIRELY in ENGLISH, professional and friendly.
   - NEVER switch to Indonesian unless the user explicitly asks.

2. AESTHETICS & FORMATTING (CRITICAL):
   - TITLES: Use **Bold Text** for section headers or key points.
   - NARRATIVE: Prefer flowing, well-structured paragraphs over long bullet lists.
   - LISTS: Use numbered (1., 2.) or bullet (-) lists only for actionable steps.
   - SYMBOLS: DO NOT use decorative or weird symbols (━, •, ▸, ●, ★, 📊). Keep it clean.
   - HEADERS: Avoid excessive markdown headers (###) inside message bubbles.
   - IMPORTANT: NEVER display raw JSON code blocks or technical data structures to the user.

3. RESPONSIBILITY:
   - Provide accurate answers based on the provided context.
   - Do not hallucinate data. If information is missing, ask for it.
   - Distinguish facts from analysis/assumptions clearly.

4. CAPABILITIES:
   - Utilize document context (RAG) when available.
   - Suggest chart visualizations for numerical trends.`;
}

/**
 * Detect language of a message
 * Returns 'id' for Indonesian, 'en' for English
 */
export function detectLanguage(message: string): 'id' | 'en' {
  if (!message) return 'en';
  
  // Broad list of common Indonesian words
  const indonesianWords = [
    'aku', 'saya', 'kamu', 'anda', 'kita', 'kami', 'mereka', 'apa', 'siapa', 'kapan', 'dimana', 'mengapa', 
    'kenapa', 'gimana', 'bisa', 'boleh', 'tolong', 'buatkan', 'jelasin', 'jelaskan', 'buat', 'lakukan', 
    'ingin', 'mau', 'punya', 'dengan', 'untuk', 'biar', 'dari', 'yang', 'ini', 'itu', 'adalah', 'yaitu', 
    'pada', 'dalam', 'di', 'ke', 'jika', 'kalau', 'apabila', 'maka', 'namun', 'tapi', 'juga', 'atau', 
    'analisis', 'laporan', 'bisnis', 'saham', 'kripto', 'pasar', 'harga', 'naik', 'turun', 'tren', 
    'anomali', 'metrik', 'bagus', 'kurang', 'lebih', 'sangat', 'sekali', 'sudah', 'sedang', 'akan', 
    'pernah', 'belum', 'tidak', 'tak', 'bukan', 'jangan', 'mungkin', 'pasti', 'tentu'
  ];

  const words = message.toLowerCase().split(/[^a-z0-9]+/);
  // Check if at least one common word exists
  const hasIDWord = words.some(word => indonesianWords.includes(word));
  
  // Also check for common affixes if no exact word matched
  if (!hasIDWord) {
    const commonIDAffixes = /(?:kan|nya|kah|lah|me|di|pe|ber)\b/i;
    if (commonIDAffixes.test(message)) return 'id';
  }

  return hasIDWord ? 'id' : 'en';
}

// Request modes
export enum RequestMode {
  MARKET_ANALYSIS = 'MODE_MARKET_ANALYSIS',
  BUSINESS_ADMIN = 'MODE_BUSINESS_ADMIN',
  LETTER_GENERATOR = 'MODE_LETTER_GENERATOR',
  REPORT_GENERATOR = 'MODE_REPORT_GENERATOR',
}

// Request context
export interface AIRequestContext {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  mode?: RequestMode;
  stream?: boolean;
  language?: 'id' | 'en'; // Added language
  fileIds?: string[]; // Added fileIds
  // Letter-specific fields
  letterType?: string;
  recipient?: string;
  subject?: string;
  content?: string;
  additionalContext?: string;
  // RAG context from document search
  ragContext?: string;
  // Persona for AI tone/strategy
  persona?: 'investor' | 'trader' | 'education';
}

// Response from handlers
export interface AIRequestResponse {
  success: boolean;
  response?: string;
  mode: RequestMode;
  error?: string;
  // Market analysis specific
  marketData?: any;
  indicators?: any;
  chart?: any;
  table?: any;
  // Letter specific
  letter?: string;
  // Structured output
  structuredOutput?: any;
  // Generated Image URL
  imageUrl?: string;
}

/**
 * Detect the appropriate mode for a given request
 */
export function detectRequestMode(context: AIRequestContext): RequestMode {
  const message = context.message?.toLowerCase() || '';

  // Explicit mode override (for letter generation API)
  if (context.mode) {
    return context.mode;
  }

  // PRIORITY 0: Check for report generation keywords
  const reportKeywords = [
    'buat laporan', 'generate report', 'buatkan analysis', 'laporan lengkap',
    'analisis mendalam', 'business analysis report', 'laporan bulanan', 'laporan',
    'reporting', 'summary report', 'executive summary', 'ringkasan eksekutif'
  ];
  if (reportKeywords.some(keyword => message.includes(keyword))) {
    return RequestMode.REPORT_GENERATOR;
  }

  // PRIORITY 0.5: If a file is present and the user asks to analyze/examine it, 
  // default to BUSINESS_ADMIN or REPORT_GENERATOR instead of Market.
  const hasFile = context.fileIds && context.fileIds.length > 0;
  const asksToAnalyze = message.includes('analisis') || message.includes('analyze') || 
                        message.includes('baca') || message.includes('read') || 
                        message.includes('identifikasi');
  
  if (hasFile && asksToAnalyze) {
     // If they specifically say "laporan", it's already caught above.
     // Otherwise, default to BUSINESS_ADMIN for general document analysis.
     return RequestMode.BUSINESS_ADMIN;
  }

  // Check for letter generation keywords
  const letterKeywords = [
    'buat surat', 'generate letter', 'tulis surat', 'bikin surat',
    'surat resmi', 'official letter', 'business letter', 'surat bisnis'
  ];
  
  // If letter-specific fields are provided, it's definitely a letter request
  if (context.letterType || context.recipient || context.subject || context.content) {
    return RequestMode.LETTER_GENERATOR;
  }
  
  // Check message for letter keywords
  if (letterKeywords.some(keyword => message.includes(keyword))) {
    return RequestMode.LETTER_GENERATOR;
  }

  // PRIORITY 1: Check for business data analysis patterns (NOT market data)
  // These are business questions about sales data, trends, etc. - NOT crypto/stock analysis
  const businessDataPatterns = [
    /(?:identifikasi|identify|analisis|analysis|trend|tren|data|penjualan|sales|revenue|pendapatan|keuangan|financial|bisnis|business|perusahaan|company|produk|product|customer|pelanggan|marketing|operasional|operational).*(?:dari|from|dengan|with|metode|method|cara|how|bagaimana|gimana)/i,
    /(?:cara|how|bagaimana|gimana|metode|method).*(?:identifikasi|identify|analisis|analysis|trend|tren|data|penjualan|sales|revenue|pendapatan|keuangan|financial|bisnis|business)/i,
    /(?:data|penjualan|sales|revenue|pendapatan|keuangan|financial|bisnis|business).*(?:trend|tren|identifikasi|identify|analisis|analysis|metode|method)/i,
  ];
  
  const isBusinessDataQuestion = businessDataPatterns.some(pattern => pattern.test(message));
  if (isBusinessDataQuestion) {
    // Business data analysis, NOT market analysis
    return RequestMode.BUSINESS_ADMIN;
  }
  
  // PRIORITY 2: Check for COMPARISON requests first
  // Comparison requests should always go to MARKET_ANALYSIS mode
  const comparisonKeywords = [
    'bandingkan', 'perbandingan', 'compare', 'comparison', 'vs', 'versus',
    'membandingkan', 'dibandingkan', 'banding', 'komparasi'
  ];
  const isComparisonRequest = comparisonKeywords.some(keyword => message.includes(keyword));
  
  // If it's a comparison request, check if it's market-related
  if (isComparisonRequest) {
    // strict check: only if it detects valid market symbols or explicit market keywords
    const marketInfo = isMarketDataRequest(message);
    
    // Additional strict check for market keywords to support "compare crypto" without specific symbols
    const hasMarketKeywords = 
      message.includes('saham') || message.includes('stock') || 
      message.includes('crypto') || message.includes('kripto') ||
      message.includes('coin') || message.includes('koin') ||
      message.includes('bitcoin') || message.includes('btc') ||
      message.includes('ethereum') || message.includes('eth');

    if (marketInfo.isMarket || hasMarketKeywords) {
      return RequestMode.MARKET_ANALYSIS;
    }
    // Otherwise, treat as business comparison (fall through)
  }
  
  // PRIORITY 3: Check for market analysis requests - MUST be explicit
  const marketInfo = isMarketDataRequest(context.message || '');
  if (marketInfo.isMarket && marketInfo.symbol) {
    // Only route to market analysis if symbol is explicitly detected
    return RequestMode.MARKET_ANALYSIS;
  }

  // PRIORITY 4: Check for BUSINESS VISUALIZATION requests
  // These are chart/grafik requests but for business data, NOT market data
  const businessVisualizationPatterns = [
    /bandingkan.*chart/i,
    /tampilkan.*perbandingan/i,
    /chart.*penjualan/i,
    /grafik.*sales/i,
    /visualisasi.*bisnis/i,
    /tampilkan.*grafik.*(?!btc|eth|bitcoin|ethereum|saham|stock|crypto|kripto)/i,
    /buat.*chart.*(?!btc|eth|bitcoin|ethereum|saham|stock|crypto|kripto)/i,
  ];
  const isBusinessVisualization = businessVisualizationPatterns.some(p => p.test(message));
  if (isBusinessVisualization && !marketInfo.isMarket) {
    console.log('📊 [AI Router] Business visualization detected, routing to BUSINESS_ADMIN');
    return RequestMode.BUSINESS_ADMIN;
  }

  // PRIORITY 5: Check for EXPLICIT market analysis keywords - must be very specific
  const explicitMarketKeywords = [
    'analisis saham', 'stock analysis', 'analisis kripto', 'crypto analysis',
    'candlestick chart', 'chart saham', 'stock chart', 'chart kripto', 'crypto chart',
    'harga saham', 'stock price', 'harga kripto', 'crypto price',
    'tampilkan chart', 'show chart', 'buat chart', 'create chart',
    'trading analysis', 'technical analysis', 'indikator teknis', 'technical indicator'
  ];
  
  // Must have explicit market keyword AND not be a business data question
  const hasExplicitMarketKeyword = explicitMarketKeywords.some(keyword => message.includes(keyword));
  
  // ✅ FIX: Only route to market if BOTH keyword AND symbol are detected
  // This prevents "tampilkan chart" from triggering Market mode when no symbol is present
  if (hasExplicitMarketKeyword && !isBusinessDataQuestion && marketInfo.isMarket && marketInfo.symbol) {
    return RequestMode.MARKET_ANALYSIS;
  }

  // Default to business admin (general business queries)
  return RequestMode.BUSINESS_ADMIN;
}

/**
 * Main router function - routes requests to appropriate handlers
 */
export async function routeAIRequest(context: AIRequestContext): Promise<AIRequestResponse> {
  try {
    // Detect mode if not explicitly provided
    const mode = context.mode || detectRequestMode(context);

    console.log(`🔄 [AI Router] Routing request to mode: ${mode}`);

    // Route to appropriate handler
    switch (mode) {
      case RequestMode.MARKET_ANALYSIS:
        return await processMarketAnalysis(context);

      case RequestMode.REPORT_GENERATOR:
        return await processReportGenerator(context);

      case RequestMode.LETTER_GENERATOR:
        return await processLetterGenerator(context);

      case RequestMode.BUSINESS_ADMIN:
      default:
        return await processBusinessAdmin(context);
    }
  } catch (error: any) {
    console.error('❌ [AI Router] Error routing request:', error);
    return {
      success: false,
      mode: context.mode || RequestMode.BUSINESS_ADMIN,
      error: error.message || 'Failed to process request',
    };
  }
}
