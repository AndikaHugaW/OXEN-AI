// Function Calling definitions for LLM
// Allows LLM to call specific functions to display charts, fetch data, etc.

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

/**
 * Function: display_comparison_chart
 * Menampilkan grafik perbandingan historis untuk sejumlah simbol saham/kripto tertentu
 */
export const DISPLAY_COMPARISON_CHART_FUNCTION: FunctionDefinition = {
  name: 'display_comparison_chart',
  description: 'Menampilkan grafik perbandingan historis untuk sejumlah simbol saham atau kripto tertentu. Gunakan fungsi ini ketika user meminta perbandingan antara beberapa aset (misalnya: "bandingkan BBCA dengan BBRI", "compare BTC and ETH").',
  parameters: {
    type: 'object',
    properties: {
      symbols: {
        type: 'array',
        description: 'Daftar simbol saham atau kripto yang akan dibandingkan. Contoh: ["BBCA", "BBRI", "TLKM"] untuk saham, atau ["BTC", "ETH", "SOL"] untuk kripto. Minimum 2 simbol, maksimum 5 simbol.',
        items: {
          type: 'string',
        },
      },
      timeframe: {
        type: 'string',
        description: 'Periode waktu historis untuk data. Pilihan: "1D" (1 hari), "5D" (5 hari), "1M" (1 bulan), "3M" (3 bulan), "6M" (6 bulan), "1Y" (1 tahun), "5Y" (5 tahun), "MAX" (maksimal). Default: "1Y" jika tidak disebutkan.',
        enum: ['1D', '5D', '1M', '3M', '6M', '1Y', '5Y', 'MAX'],
      },
      asset_type: {
        type: 'string',
        description: 'Jenis aset yang dibandingkan. "stock" untuk saham, "crypto" untuk kripto. Deteksi otomatis dari simbol jika tidak disebutkan.',
        enum: ['stock', 'crypto'],
      },
    },
    required: ['symbols'],
  },
};

/**
 * Parse function call from LLM response
 * Supports multiple formats:
 * 1. OpenAI/Groq function calling format
 * 2. JSON with function_call field
 * 3. Plain JSON matching function structure
 */
export function parseFunctionCall(response: string): FunctionCall | null {
  if (!response || typeof response !== 'string') {
    return null;
  }

  try {
    // Strategy 1: Try parsing as pure JSON
    const trimmed = response.trim();
    let parsed: any;
    
    // Extract JSON from markdown code block if present
    const jsonMatch = trimmed.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                      trimmed.match(/```\s*(\{[\s\S]*?\})\s*```/) ||
                      trimmed.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      parsed = JSON.parse(trimmed);
    } else {
      return null;
    }

    // Check for OpenAI/Groq function calling format
    if (parsed.function_call) {
      return {
        name: parsed.function_call.name,
        arguments: typeof parsed.function_call.arguments === 'string' 
          ? JSON.parse(parsed.function_call.arguments)
          : parsed.function_call.arguments,
      };
    }

    // Check for direct function call format
    if (parsed.name && parsed.arguments) {
      return {
        name: parsed.name,
        arguments: typeof parsed.arguments === 'string' 
          ? JSON.parse(parsed.arguments)
          : parsed.arguments,
      };
    }

    // Check if it matches display_comparison_chart structure
    if (parsed.symbols && Array.isArray(parsed.symbols) && parsed.symbols.length >= 2) {
      return {
        name: 'display_comparison_chart',
        arguments: {
          symbols: parsed.symbols,
          timeframe: parsed.timeframe || '1Y',
          asset_type: parsed.asset_type || detectAssetType(parsed.symbols[0]),
        },
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to parse function call:', error);
    return null;
  }
}

/**
 * Detect asset type from symbol
 */
function detectAssetType(symbol: string): 'stock' | 'crypto' {
  const cryptoKeywords = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'MATIC', 'AVAX', 'DOGE', 'LTC', 'LINK', 'ATOM', 'TRX'];
  const upperSymbol = symbol.toUpperCase();
  
  if (cryptoKeywords.includes(upperSymbol) || upperSymbol.endsWith('.JK') === false) {
    // Check if it's a known crypto or doesn't have .JK suffix (likely crypto)
    // For Indonesian stocks, they usually have .JK suffix
    if (upperSymbol.endsWith('.JK')) {
      return 'stock';
    }
    // Default: assume stock for short symbols, crypto for longer ones
    return upperSymbol.length <= 4 ? 'stock' : 'crypto';
  }
  
  return 'crypto';
}

/**
 * Get function definitions for LLM prompt
 */
export function getFunctionDefinitions(): FunctionDefinition[] {
  return [DISPLAY_COMPARISON_CHART_FUNCTION];
}

/**
 * Format function definitions for LLM prompt
 */
export function formatFunctionsForPrompt(): string {
  const functions = getFunctionDefinitions();
  
  return functions.map(func => {
    const params = Object.entries(func.parameters.properties)
      .map(([key, prop]) => {
        const enumStr = prop.enum ? ` (${prop.enum.join(' | ')})` : '';
        const required = func.parameters.required.includes(key) ? ' [REQUIRED]' : ' [OPTIONAL]';
        return `  - ${key} (${prop.type}${enumStr})${required}: ${prop.description}`;
      })
      .join('\n');
    
    return `Fungsi: ${func.name}
Deskripsi: ${func.description}
Parameter:
${params}
`;
  }).join('\n\n');
}

