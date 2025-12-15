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

  // Check for market analysis requests
  const marketInfo = isMarketDataRequest(context.message || '');
  if (marketInfo.isMarket) {
    return RequestMode.MARKET_ANALYSIS;
  }

  // Check for market analysis keywords even if symbol not detected
  const marketKeywords = [
    'analisis saham', 'stock analysis', 'analisis kripto', 'crypto analysis',
    'candlestick', 'chart saham', 'stock chart', 'chart kripto', 'crypto chart',
    'harga saham', 'stock price', 'harga kripto', 'crypto price',
    'trading', 'investasi', 'indikator teknis', 'technical indicator'
  ];
  
  if (marketKeywords.some(keyword => message.includes(keyword))) {
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
