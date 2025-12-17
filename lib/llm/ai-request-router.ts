// AI Request Router - Centralized routing system for different AI request modes
// Routes requests to appropriate handlers based on mode detection

import { getLLMProvider } from './providers';
import { isMarketDataRequest } from './chart-generator';
import { processMarketAnalysis } from './handlers/market-analysis-handler';
import { processBusinessAdmin } from './handlers/business-admin-handler';
import { processLetterGenerator } from './handlers/letter-generator-handler';

/**
 * Global prompt rules that apply to all modes
 */
export function getGlobalPromptRules(): string {
  return `━━━━━━━━━━━━━━━━━━━━━━
ATURAN GLOBAL (WAJIB)
━━━━━━━━━━━━━━━━━━━━━━

🚨🚨🚨 PENTING SEKALI - BAHASA RESPONS (WAJIB DIPATUHI): 🚨🚨🚨
- SELALU gunakan bahasa yang SAMA dengan bahasa pertanyaan user
- Jika user bertanya dalam Bahasa Indonesia → jawab 100% dalam Bahasa Indonesia
- Jika user bertanya dalam English → jawab 100% dalam English
- Jika user bertanya dalam campuran bahasa → ikuti bahasa dominan yang digunakan user
- JANGAN gunakan bahasa lain selain bahasa yang digunakan user
- Ini adalah ATURAN WAJIB yang TIDAK BOLEH dilanggar
- Deteksi bahasa dari pertanyaan user dan sesuaikan respons kamu

⚠️⚠️⚠️ PENTING - JANGAN ULANG ATURAN PROMPT:
- JANGAN menulis kembali atau mengutip aturan-aturan di atas dalam respons kamu
- JANGAN menampilkan instruksi seperti "🚨🚨🚨 PENTING SEKALI - BAHASA RESPONS" atau aturan lainnya
- JANGAN menjelaskan bahwa kamu mengikuti aturan tertentu
- Langsung jawab pertanyaan user dengan natural, seolah-olah aturan tersebut sudah otomatis diterapkan
- User tidak perlu tahu tentang aturan internal yang kamu gunakan

1. Tentukan MODE kerja sebelum menjawab:
   - MODE_MARKET_ANALYSIS: Untuk analisis pasar saham & kripto
   - MODE_BUSINESS_ADMIN: Untuk administrasi bisnis perusahaan & agency
   - MODE_LETTER_GENERATOR: Untuk pembuatan surat & dokumen profesional

2. Gunakan HANYA mode yang relevan dengan permintaan user.

3. JANGAN mengarang data, harga, fakta, atau regulasi.

4. Jika data tidak cukup → tolak analisis dan minta data tambahan.

5. Pisahkan dengan jelas: FAKTA, ANALISIS, dan ASUMSI.

6. Output bersifat informatif, bukan keputusan final.

7. Jika konteks tidak jelas, minta user menentukan MODE terlebih dahulu.

━━━━━━━━━━━━━━━━━━━━━━`;
}

// Request modes
export enum RequestMode {
  MARKET_ANALYSIS = 'MODE_MARKET_ANALYSIS',
  BUSINESS_ADMIN = 'MODE_BUSINESS_ADMIN',
  LETTER_GENERATOR = 'MODE_LETTER_GENERATOR',
}

// Request context
export interface AIRequestContext {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  mode?: RequestMode;
  stream?: boolean;
  // Letter-specific fields
  letterType?: string;
  recipient?: string;
  subject?: string;
  content?: string;
  additionalContext?: string;
  // RAG context from document search
  ragContext?: string;
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
  
  // If it's a comparison request with market-related context, route to market analysis
  if (isComparisonRequest && (message.includes('saham') || message.includes('stock') || 
      message.includes('chart') || message.includes('crypto') || message.includes('kripto') ||
      message.includes('aset') || message.includes('asset') || message.includes('harga') ||
      message.includes('price') || message.includes('coin') || message.includes('koin') ||
      // Also check if any stock/crypto symbol pattern exists in the message
      /\b[A-Z]{3,5}\b/.test(context.message || ''))) {
    return RequestMode.MARKET_ANALYSIS;
  }
  
  // PRIORITY 3: Check for market analysis requests - MUST be explicit
  const marketInfo = isMarketDataRequest(context.message || '');
  if (marketInfo.isMarket && marketInfo.symbol) {
    // Only route to market analysis if symbol is explicitly detected
    return RequestMode.MARKET_ANALYSIS;
  }

  // PRIORITY 3: Check for EXPLICIT market analysis keywords - must be very specific
  const explicitMarketKeywords = [
    'analisis saham', 'stock analysis', 'analisis kripto', 'crypto analysis',
    'candlestick chart', 'chart saham', 'stock chart', 'chart kripto', 'crypto chart',
    'harga saham', 'stock price', 'harga kripto', 'crypto price',
    'tampilkan chart', 'show chart', 'buat chart', 'create chart',
    'trading analysis', 'technical analysis', 'indikator teknis', 'technical indicator'
  ];
  
  // Must have explicit market keyword AND not be a business data question
  const hasExplicitMarketKeyword = explicitMarketKeywords.some(keyword => message.includes(keyword));
  
  if (hasExplicitMarketKeyword && !isBusinessDataQuestion) {
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

      case RequestMode.BUSINESS_ADMIN:
        return await processBusinessAdmin(context);

      case RequestMode.LETTER_GENERATOR:
        return await processLetterGenerator(context);

      default:
        // Fallback to business admin
        console.warn(`⚠️ [AI Router] Unknown mode, falling back to BUSINESS_ADMIN`);
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
