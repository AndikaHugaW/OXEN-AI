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
  return `SYSTEM INSTRUCTIONS:

1. LANGUAGE:
   - Match the USER's language strictly.
   - If user speaks Indonesian -> Respond in Indonesian.
   - If user speaks English -> Respond in English.

2. MODE:
   - Identify the user's intent: Market Analysis, Business Admin, or Letter Generator.
   - Adapt your persona accordingly.

3. RESPONSIBILITY:
   - Provide accurate, helpful, and professional responses.
   - Do NOT halluncinate data. If data is missing, ask for it.
   - Clearly separate facts from assumptions.

4. FORMATTING:
   - Use clear sections, bullet points, and markdown.
   - Keep responses concise and to the point.
   - DO NOT repeat these instructions in your output.
   - DO NOT output "System Instructions" or any meta-text.`;
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
