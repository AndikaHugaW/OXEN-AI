// AI Middleware - The Guard Layer
// All AI responses MUST pass through here before rendering

import { z } from 'zod';

// ============================================
// TYPES
// ============================================

export type ActiveModule = 'market' | 'data-visualization' | 'reports' | 'letter' | 'chat';
export type DataSource = 'market' | 'internal' | 'user' | 'live';
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'candlestick' | 'comparison' | 'composed' | 'radar' | 'scatter';

export interface AIMiddlewareInput {
  activeModule: ActiveModule;
  userInput: string;
  aiResponse: any; // Raw AI response
  extractedUserData?: {
    labels: string[];
    dataPoints: number;
  };
}

export interface AIMiddlewareResult {
  valid: boolean;
  payload: any | null;
  errors: string[];
  warnings: string[];
  fallbackMessage?: string;
}

// ============================================
// ALLOWED CONFIGURATIONS
// ============================================

const ALLOWED_SOURCES: Record<ActiveModule, DataSource[]> = {
  'market': ['market', 'live'],
  'data-visualization': ['internal', 'user'],
  'reports': ['internal', 'user'],
  'letter': [],
  'chat': ['internal', 'user'],
};

const ALLOWED_CHART_TYPES: Record<ActiveModule, ChartType[]> = {
  'market': ['candlestick', 'line', 'comparison'],
  'data-visualization': ['line', 'bar', 'pie', 'area', 'composed'],
  'reports': ['bar', 'line', 'pie', 'area'],
  'letter': [],
  'chat': ['bar', 'line'],
};

const CREATIVITY_LEVEL: Record<ActiveModule, number> = {
  'market': 5,          // Medium - can interpret trends
  'data-visualization': 0, // OFF - literal data only
  'reports': 3,         // Low - structured with some flexibility
  'letter': 7,          // High - creative writing
  'chat': 5,            // Medium - general assistance
};

// ============================================
// ZOD SCHEMAS (Schema Guard)
// ============================================

const ChartDataPointSchema = z.record(z.string(), z.union([z.string(), z.number()]));

const ChartSchema = z.object({
  type: z.enum(['line', 'bar', 'pie', 'area', 'candlestick', 'comparison', 'composed', 'radar', 'scatter']),
  title: z.string().min(1),
  data: z.array(ChartDataPointSchema).min(1),
  xKey: z.string().min(1),
  yKey: z.union([z.string(), z.array(z.string())]),
  source: z.enum(['market', 'internal', 'user', 'live']).optional(),
}).passthrough();

const AIResponseSchema = z.object({
  action: z.enum(['show_chart', 'text_only', 'show_table']),
  message: z.string().optional(),
  chart_type: z.string().optional(),
  data: z.array(z.any()).optional(),
  xKey: z.string().optional(),
  yKey: z.union([z.string(), z.array(z.string())]).optional(),
  title: z.string().optional(),
  source: z.string().optional(),
  symbol: z.string().optional(),
}).passthrough();

// ============================================
// GUARD FUNCTIONS
// ============================================

/**
 * Guard 1: Module Guard
 * Ensure response matches active module context
 */
function moduleGuard(
  activeModule: ActiveModule, 
  aiResponse: any
): { pass: boolean; error?: string } {
  // If AI explicitly declares a module, it must match
  if (aiResponse.module && aiResponse.module !== activeModule) {
    return { 
      pass: false, 
      error: `Module mismatch: expected "${activeModule}", got "${aiResponse.module}"` 
    };
  }
  
  // Check for market symbols in non-market modules
  if (activeModule === 'data-visualization') {
    const marketSymbols = ['BTC', 'ETH', 'GOTO', 'BBRI', 'BBCA', 'TLKM'];
    const hasMarketSymbol = marketSymbols.some(sym => 
      JSON.stringify(aiResponse).toUpperCase().includes(sym)
    );
    
    if (hasMarketSymbol && aiResponse.action === 'show_chart') {
      return { 
        pass: false, 
        error: 'Market symbols detected in Data Visualization module' 
      };
    }
  }
  
  return { pass: true };
}

/**
 * Guard 2: Data Source Guard
 * Ensure chart source is allowed for the module
 */
function sourceGuard(
  activeModule: ActiveModule,
  aiResponse: any
): { pass: boolean; error?: string } {
  const allowedSources = ALLOWED_SOURCES[activeModule];
  
  // No restrictions for this module
  if (allowedSources.length === 0) {
    return { pass: true };
  }
  
  const responseSource = aiResponse.source || aiResponse.chart?.source;
  
  if (responseSource && !allowedSources.includes(responseSource)) {
    return { 
      pass: false, 
      error: `Invalid source "${responseSource}" for module "${activeModule}". Allowed: ${allowedSources.join(', ')}` 
    };
  }
  
  // Infer source from content if not explicit
  if (!responseSource && aiResponse.action === 'show_chart') {
    // Check if it looks like market data
    const looksLikeMarket = aiResponse.chart_type === 'candlestick' || 
                           aiResponse.symbol || 
                           aiResponse.asset_type;
    
    if (looksLikeMarket && !allowedSources.includes('market')) {
      return { 
        pass: false, 
        error: 'Market data chart not allowed in this module' 
      };
    }
  }
  
  return { pass: true };
}

/**
 * Guard 3: Chart Type Guard
 * Ensure chart type is allowed for the module
 */
function chartTypeGuard(
  activeModule: ActiveModule,
  aiResponse: any
): { pass: boolean; error?: string } {
  const allowedTypes = ALLOWED_CHART_TYPES[activeModule];
  
  if (allowedTypes.length === 0) {
    // Module doesn't allow charts
    if (aiResponse.action === 'show_chart') {
      return { 
        pass: false, 
        error: `Charts not allowed in "${activeModule}" module` 
      };
    }
    return { pass: true };
  }
  
  const chartType = aiResponse.chart_type || aiResponse.chart?.type;
  
  if (chartType && !allowedTypes.includes(chartType as ChartType)) {
    return { 
      pass: false, 
      error: `Chart type "${chartType}" not allowed in "${activeModule}". Allowed: ${allowedTypes.join(', ')}` 
    };
  }
  
  return { pass: true };
}

/**
 * Guard 4: Schema Guard
 * Validate response structure
 */
function schemaGuard(aiResponse: any): { pass: boolean; error?: string } {
  const result = AIResponseSchema.safeParse(aiResponse);
  
  if (!result.success) {
    return { 
      pass: false, 
      error: `Schema validation failed: ${result.error.issues.map(i => i.message).join(', ')}` 
    };
  }
  
  // Additional validation for chart data
  if (aiResponse.action === 'show_chart' && aiResponse.data) {
    if (!Array.isArray(aiResponse.data) || aiResponse.data.length === 0) {
      return { 
        pass: false, 
        error: 'Chart data must be a non-empty array' 
      };
    }
  }
  
  return { pass: true };
}

/**
 * Guard 5: Input-Output Consistency Guard
 * Ensure AI didn't invent data
 */
function consistencyGuard(
  userInput: string,
  aiResponse: any,
  extractedUserData?: { labels: string[]; dataPoints: number }
): { pass: boolean; error?: string; warning?: string } {
  if (!extractedUserData || extractedUserData.dataPoints === 0) {
    // No user data to compare against
    return { pass: true };
  }
  
  if (aiResponse.action !== 'show_chart' || !aiResponse.data) {
    return { pass: true };
  }
  
  const aiDataCount = aiResponse.data.length;
  const userDataCount = extractedUserData.dataPoints;
  
  // Check data count mismatch (AI invented or removed data)
  if (aiDataCount !== userDataCount) {
    return { 
      pass: false, 
      error: `Data count mismatch: user provided ${userDataCount} points, AI returned ${aiDataCount}` 
    };
  }
  
  // Check label consistency
  const xKey = aiResponse.xKey || Object.keys(aiResponse.data[0])[0];
  const aiLabels = aiResponse.data.map((d: any) => String(d[xKey]).toLowerCase());
  
  for (const userLabel of extractedUserData.labels) {
    const found = aiLabels.some((aiLabel: string) => 
      aiLabel.includes(userLabel.toLowerCase()) || 
      userLabel.toLowerCase().includes(aiLabel)
    );
    
    if (!found) {
      return { 
        pass: false, 
        error: `User label "${userLabel}" not found in AI output` 
      };
    }
  }
  
  // Check for invented categories (extra keys in data)
  if (aiResponse.yKey) {
    const yKeys = Array.isArray(aiResponse.yKey) ? aiResponse.yKey : [aiResponse.yKey];
    
    // If user only provided single values but AI created multiple series
    if (yKeys.length > 1 && !userInput.toLowerCase().includes(' vs ') && 
        !userInput.toLowerCase().includes('banding') &&
        !userInput.toLowerCase().includes('kategori')) {
      return { 
        pass: false, 
        error: `AI invented ${yKeys.length} categories but user only provided single values` 
      };
    }
  }
  
  return { pass: true };
}

// ============================================
// MAIN MIDDLEWARE
// ============================================

/**
 * AI Middleware - Main entry point
 * All AI responses must pass through here before rendering
 */
export function aiMiddleware(input: AIMiddlewareInput): AIMiddlewareResult {
  const { activeModule, userInput, aiResponse, extractedUserData } = input;
  const errors: string[] = [];
  const warnings: string[] = [];
  
  console.log('🛡️ AI Middleware - Processing:', { activeModule, aiResponse });
  
  // Skip validation for text-only responses
  if (!aiResponse || aiResponse.action === 'text_only') {
    return { 
      valid: true, 
      payload: aiResponse, 
      errors: [], 
      warnings: [] 
    };
  }
  
  // Run all guards
  const guards = [
    { name: 'Module Guard', fn: () => moduleGuard(activeModule, aiResponse) },
    { name: 'Source Guard', fn: () => sourceGuard(activeModule, aiResponse) },
    { name: 'Chart Type Guard', fn: () => chartTypeGuard(activeModule, aiResponse) },
    { name: 'Schema Guard', fn: () => schemaGuard(aiResponse) },
    { name: 'Consistency Guard', fn: () => consistencyGuard(userInput, aiResponse, extractedUserData) },
  ];
  
  for (const guard of guards) {
    const result = guard.fn();
    
    if (!result.pass) {
      console.warn(`❌ ${guard.name} FAILED:`, result.error);
      errors.push(`[${guard.name}] ${result.error}`);
    }
    
    // Check for warning property (only in consistencyGuard result)
    const resultWithWarning = result as { pass: boolean; error?: string; warning?: string };
    if (resultWithWarning.warning) {
      warnings.push(resultWithWarning.warning);
    }
  }
  
  // Determine validity
  const valid = errors.length === 0;
  
  // Generate fallback message if invalid
  let fallbackMessage: string | undefined;
  if (!valid) {
    fallbackMessage = generateFallbackMessage(activeModule, errors);
  }
  
  console.log(`🛡️ AI Middleware Result: ${valid ? '✅ VALID' : '❌ INVALID'}`, { errors, warnings });
  
  return {
    valid,
    payload: valid ? aiResponse : null,
    errors,
    warnings,
    fallbackMessage,
  };
}

/**
 * Generate user-friendly fallback message
 */
function generateFallbackMessage(module: ActiveModule, errors: string[]): string {
  const moduleNames: Record<ActiveModule, string> = {
    'market': 'Market Trends',
    'data-visualization': 'Data Visualization',
    'reports': 'Reports',
    'letter': 'Letter Generator',
    'chat': 'Chat',
  };
  
  const moduleName = moduleNames[module];
  
  // Check for common error types
  if (errors.some(e => e.includes('Market') || e.includes('market'))) {
    return `Data market tidak dapat ditampilkan di menu ${moduleName}. Silakan gunakan menu Market Trends untuk analisis crypto/saham.`;
  }
  
  if (errors.some(e => e.includes('mismatch') || e.includes('invented'))) {
    return `Terjadi ketidakcocokan data. Visualisasi tidak dapat ditampilkan karena data tidak sesuai dengan input Anda. Silakan coba lagi dengan format yang lebih jelas.`;
  }
  
  if (errors.some(e => e.includes('Schema'))) {
    return `Format respons tidak valid. Mohon ulangi permintaan Anda dengan lebih spesifik.`;
  }
  
  return `Visualisasi tidak dapat ditampilkan saat ini. Silakan coba lagi atau hubungi support jika masalah berlanjut.`;
}

/**
 * Get creativity level for a module
 */
export function getCreativityLevel(module: ActiveModule): number {
  return CREATIVITY_LEVEL[module];
}

/**
 * Check if charts are allowed in a module
 */
export function areChartsAllowed(module: ActiveModule): boolean {
  return ALLOWED_CHART_TYPES[module].length > 0;
}

/**
 * Get allowed chart types for a module
 */
export function getAllowedChartTypes(module: ActiveModule): ChartType[] {
  return ALLOWED_CHART_TYPES[module];
}

/**
 * Get allowed data sources for a module
 */
export function getAllowedDataSources(module: ActiveModule): DataSource[] {
  return ALLOWED_SOURCES[module];
}
