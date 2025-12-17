// Comparison Rule Engine
// Validates data sufficiency and provides elegant UX messages

export type ComparisonType = 'time_trend' | 'entity_ranking' | 'market_share' | 'benchmark';
export type DataSufficiency = 'insufficient' | 'minimal' | 'adequate' | 'strong';

export interface ComparisonValidation {
  isValid: boolean;
  sufficiency: DataSufficiency;
  dataCount: number;
  minimumRequired: number;
  idealRequired: number;
  message: string;
  suggestion?: string;
  canProceed: boolean;
}

// ============================================
// MINIMUM DATA REQUIREMENTS
// ============================================

const REQUIREMENTS: Record<ComparisonType, { min: number; ideal: number; strong: number }> = {
  time_trend: { min: 2, ideal: 3, strong: 4 },
  entity_ranking: { min: 3, ideal: 4, strong: 5 },
  market_share: { min: 3, ideal: 4, strong: 5 },
  benchmark: { min: 4, ideal: 5, strong: 6 },
};

// ============================================
// ELEGANT UX MESSAGES
// ============================================

const MESSAGES = {
  insufficient: {
    time_trend: 'Perbandingan waktu membutuhkan minimal 2 periode.',
    entity_ranking: 'Ranking membutuhkan minimal 3 entitas untuk perbandingan yang bermakna.',
    market_share: 'Analisis market share membutuhkan minimal 3 pemain pasar.',
    benchmark: 'Benchmarking membutuhkan minimal 4 data pembanding.',
  },
  minimal: {
    time_trend: 'Data dapat divisualisasi, namun tren akan lebih jelas dengan 1 periode tambahan.',
    entity_ranking: 'Ranking dapat ditampilkan. Tambahkan 1 entitas lagi untuk insight lebih kaya.',
    market_share: 'Distribusi pasar dapat dihitung. Pertimbangkan menambah pemain untuk gambaran lengkap.',
    benchmark: 'Benchmark dasar tersedia. Tambahkan lebih banyak pembanding untuk akurasi.',
  },
  adequate: {
    time_trend: 'Data cukup untuk analisis tren. Arah pergerakan dapat diidentifikasi.',
    entity_ranking: 'Data memadai untuk ranking dan perbandingan.',
    market_share: 'Analisis market share dapat dilakukan dengan baik.',
    benchmark: 'Data benchmark memadai untuk evaluasi.',
  },
  strong: {
    time_trend: 'Data lengkap untuk analisis tren, proyeksi, dan deteksi anomali.',
    entity_ranking: 'Data komprehensif untuk ranking, gap analysis, dan competitive insight.',
    market_share: 'Data kuat untuk analisis pasar, konsentrasi, dan strategi.',
    benchmark: 'Data robust untuk benchmarking mendalam dan rekomendasi aksi.',
  },
};

const SUGGESTIONS = {
  time_trend: {
    1: 'Tambahkan minimal 1 periode lagi (contoh: bulan sebelum atau sesudah).',
    2: 'Pertimbangkan menambah 1 periode untuk melihat arah tren.',
  },
  entity_ranking: {
    1: 'Tambahkan minimal 2 entitas lagi untuk ranking yang bermakna.',
    2: 'Tambahkan 1 entitas lagi agar perbandingan lebih kaya.',
  },
  market_share: {
    1: 'Tambahkan minimal 2 pemain pasar lagi.',
    2: 'Tambahkan 1 pemain pasar untuk gambaran lebih lengkap.',
  },
  benchmark: {
    1: 'Tambahkan minimal 3 data pembanding.',
    2: 'Tambahkan 2 data pembanding lagi.',
    3: 'Tambahkan 1 data pembanding untuk analisis lebih kuat.',
  },
};

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate data sufficiency for comparison
 * Returns elegant messages suitable for end-user display
 */
export function validateComparison(
  dataCount: number,
  comparisonType: ComparisonType = 'time_trend'
): ComparisonValidation {
  const req = REQUIREMENTS[comparisonType];
  
  // Determine sufficiency level
  let sufficiency: DataSufficiency;
  let isValid: boolean;
  let canProceed: boolean;
  
  if (dataCount < req.min) {
    sufficiency = 'insufficient';
    isValid = false;
    canProceed = false;
  } else if (dataCount < req.ideal) {
    sufficiency = 'minimal';
    isValid = true;
    canProceed = true;
  } else if (dataCount < req.strong) {
    sufficiency = 'adequate';
    isValid = true;
    canProceed = true;
  } else {
    sufficiency = 'strong';
    isValid = true;
    canProceed = true;
  }
  
  // Get appropriate message
  const message = MESSAGES[sufficiency][comparisonType];
  
  // Get suggestion if needed
  let suggestion: string | undefined;
  if (sufficiency === 'insufficient' || sufficiency === 'minimal') {
    const suggestionMap = SUGGESTIONS[comparisonType] as Record<number, string>;
    suggestion = suggestionMap[dataCount] || suggestionMap[Math.min(dataCount, Object.keys(suggestionMap).length)];
  }
  
  return {
    isValid,
    sufficiency,
    dataCount,
    minimumRequired: req.min,
    idealRequired: req.ideal,
    message,
    suggestion,
    canProceed,
  };
}

/**
 * Detect comparison type from user input
 */
export function detectComparisonType(input: string): ComparisonType {
  const lower = input.toLowerCase();
  
  // Market share indicators
  if (/market.?share|pangsa.?pasar|distribusi|persentase|%/.test(lower)) {
    return 'market_share';
  }
  
  // Benchmark indicators
  if (/benchmark|standar|target|kpi|goal|vs.?target/.test(lower)) {
    return 'benchmark';
  }
  
  // Entity ranking indicators
  if (/produk|cabang|region|wilayah|brand|merek|perusahaan|company/.test(lower)) {
    return 'entity_ranking';
  }
  
  // Default: time trend
  return 'time_trend';
}

// ============================================
// COMPARISON GUARD (For Route/Component Use)
// ============================================

export interface ComparisonGuardResult {
  allowed: boolean;
  type: ComparisonType;
  validation: ComparisonValidation;
  userMessage: string;
}

/**
 * Main guard function to use before rendering comparison charts
 */
export function comparisonGuard(
  input: string,
  dataCount: number
): ComparisonGuardResult {
  const type = detectComparisonType(input);
  const validation = validateComparison(dataCount, type);
  
  // Build user-friendly message
  let userMessage: string;
  
  if (validation.sufficiency === 'insufficient') {
    userMessage = `⚠️ ${validation.message}\n\n💡 ${validation.suggestion}`;
  } else if (validation.sufficiency === 'minimal') {
    userMessage = `📊 ${validation.message}\n\n💡 Tip: ${validation.suggestion}`;
  } else {
    userMessage = `✅ ${validation.message}`;
  }
  
  return {
    allowed: validation.canProceed,
    type,
    validation,
    userMessage,
  };
}

// ============================================
// INTEGRATION HELPER
// ============================================

/**
 * Get validation for use in datasetToChartData
 */
export function getDataSufficiencyInfo(
  dataCount: number,
  isComparison: boolean = false
): { 
  canVisualize: boolean; 
  warningMessage?: string;
  tipMessage?: string;
} {
  // Basic check: always need at least 2 data points
  if (dataCount < 2) {
    return {
      canVisualize: false,
      warningMessage: 'Visualisasi membutuhkan minimal 2 data point.',
      tipMessage: 'Tambahkan setidaknya 1 data lagi untuk membuat grafik.',
    };
  }
  
  // For comparison mode
  if (isComparison && dataCount < 3) {
    return {
      canVisualize: true,
      warningMessage: 'Perbandingan dengan 2 data masih terbatas.',
      tipMessage: 'Untuk insight yang lebih bermakna, pertimbangkan menambah 1 data lagi.',
    };
  }
  
  // For trend analysis
  if (dataCount === 2) {
    return {
      canVisualize: true,
      tipMessage: 'Data mencukupi untuk visualisasi dasar. Tambahkan 1 periode untuk melihat tren.',
    };
  }
  
  if (dataCount === 3) {
    return {
      canVisualize: true,
      tipMessage: 'Tren dapat diidentifikasi. Data memadai untuk analisis.',
    };
  }
  
  // 4+ data points: strong
  return {
    canVisualize: true,
  };
}
