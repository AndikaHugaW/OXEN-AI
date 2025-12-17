// Natural Language to Dataset Parser V2
// DETERMINISTIC - AI TIDAK BOLEH SENTUH DATA
// Parser ini adalah SATU-SATUNYA sumber kebenaran untuk Data Visualization

export interface ExtractedDataPoint {
  label: string;        // Label ASLI dari user (tidak diubah)
  value: number;        // Nilai numerik
  rawValue: string;     // String asli dari user (e.g., "500jt")
}

export interface ExtractedDataset {
  success: boolean;
  dataPoints: ExtractedDataPoint[];
  detectedUnit: 'juta' | 'miliar' | 'ribu' | 'unit' | null;
  detectedLabels: string[];
  isComparison: boolean;
  categories?: string[];
  originalInput: string;
  parseMethod: 'month_value' | 'label_value' | 'fallback' | 'none';
  warnings?: string[];
  errors?: string[];
  requiresConfirmation?: boolean;
}

// ============================================
// MONTH MAPPINGS (KEEP ORIGINAL)
// ============================================

const MONTH_MAP: Record<string, string> = {
  // Full Indonesian
  'januari': 'Januari',
  'februari': 'Februari',
  'maret': 'Maret',
  'april': 'April',
  'mei': 'Mei',
  'juni': 'Juni',
  'juli': 'Juli',
  'agustus': 'Agustus',
  'september': 'September',
  'oktober': 'Oktober',
  'november': 'November',
  'desember': 'Desember',
  // Short Indonesian
  'jan': 'Januari',
  'feb': 'Februari',
  'mar': 'Maret',
  'apr': 'April',
  'jun': 'Juni',
  'jul': 'Juli',
  'agu': 'Agustus',
  'sep': 'September',
  'okt': 'Oktober',
  'nov': 'November',
  'des': 'Desember',
  // Full English (normalize to Indonesian)
  'january': 'Januari',
  'february': 'Februari',
  'march': 'Maret',
  'may': 'Mei',
  'june': 'Juni',
  'july': 'Juli',
  'august': 'Agustus',
  'october': 'Oktober',
  'december': 'Desember',
};

const QUARTER_MAP: Record<string, string> = {
  'q1': 'Q1',
  'q2': 'Q2',
  'q3': 'Q3',
  'q4': 'Q4',
  'kuartal 1': 'Q1',
  'kuartal 2': 'Q2',
  'kuartal 3': 'Q3',
  'kuartal 4': 'Q4',
};

// ============================================
// NUMBER PARSING (ENHANCED)
// ============================================

/**
 * Parse Indonesian number notation
 * "500jt" → 500000000
 * "0.9B" → 900000000
 * "1.500.000" → 1500000 (Indonesian notation)
 * "2 miliar" → 2000000000
 */
function parseNumber(text: string): { value: number; unit: string } | null {
  let cleaned = text.toLowerCase().trim().replace(/\s+/g, '');
  
  // Handle Indonesian thousands notation (1.500.000 → 1500000)
  // If there are multiple dots and they're separating 3-digit groups
  const dots = (cleaned.match(/\./g) || []).length;
  if (dots >= 2) {
    // Likely Indonesian format: 1.500.000
    cleaned = cleaned.replace(/\./g, '');
  } else if (dots === 1 && !cleaned.match(/\d\.\d{1,2}(?:[bmkjt]|jt|juta|miliar|ribu)?$/i)) {
    // Single dot but not decimal (e.g., "1.500" = 1500)
    const parts = cleaned.split('.');
    if (parts[1]?.length === 3 && !/[a-z]/i.test(parts[1])) {
      cleaned = cleaned.replace(/\./g, '');
    }
  }
  
  // Patterns ordered by specificity
  const patterns: Array<{ regex: RegExp; multiplier: number; unit: string }> = [
    // Billions
    { regex: /^([\d.]+)\s*(?:miliar|milyar)$/i, multiplier: 1_000_000_000, unit: 'miliar' },
    { regex: /^([\d.]+)\s*b$/i, multiplier: 1_000_000_000, unit: 'miliar' }, // 0.9B = 900jt
    
    // Millions (juta)
    { regex: /^([\d.]+)\s*(?:jt|juta)$/i, multiplier: 1_000_000, unit: 'juta' },
    { regex: /^([\d.]+)\s*m$/i, multiplier: 1_000_000, unit: 'juta' }, // "M" = million
    
    // Thousands
    { regex: /^([\d.]+)\s*(?:rb|ribu|k)$/i, multiplier: 1_000, unit: 'ribu' },
    
    // Plain number (no unit)
    { regex: /^([\d.]+)$/i, multiplier: 1, unit: 'unit' },
  ];
  
  for (const { regex, multiplier, unit } of patterns) {
    const match = cleaned.match(regex);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && isFinite(num)) {
        return { value: num * multiplier, unit };
      }
    }
  }
  
  // Last resort: extract any number
  const numMatch = cleaned.match(/[\d.]+/);
  if (numMatch) {
    const num = parseFloat(numMatch[0]);
    if (!isNaN(num) && isFinite(num)) {
      return { value: num, unit: 'unit' };
    }
  }
  
  return null;
}

/**
 * Common typos for Indonesian month names
 */
const MONTH_TYPOS: Record<string, string> = {
  // Januari typos
  'januri': 'januari',
  'januray': 'januari',
  'janauri': 'januari',
  'jnuari': 'januari',
  
  // Februari typos
  'febuari': 'februari',
  'pebruari': 'februari',
  'februari': 'februari',
  'febuary': 'februari',
  'feburari': 'februari',
  
  // Maret typos
  'marer': 'maret',
  'martet': 'maret',
  
  // April typos
  'aprill': 'april',
  'aprl': 'april',
  
  // Mei typos (usually correct)
  
  // Juni typos
  'junni': 'juni',
  'jni': 'juni',
  
  // Juli typos
  'jully': 'juli',
  'julli': 'juli',
  
  // Agustus typos
  'agusutus': 'agustus',
  'agusts': 'agustus',
  'agstus': 'agustus',
  
  // September typos
  'septmber': 'september',
  'setember': 'september',
  'sepetember': 'september',
  
  // Oktober typos
  'okotber': 'oktober',
  'oktber': 'oktober',
  'ocktober': 'oktober',
  
  // November typos
  'novmber': 'november',
  'noveber': 'november',
  
  // Desember typos
  'desemeber': 'desember',
  'descember': 'desember',
  'desembr': 'desember',
};

/**
 * Levenshtein distance for fuzzy matching (simple implementation)
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Normalize label to proper case (keep original language)
 * Includes typo correction for month names
 */
function normalizeLabel(label: string): string {
  let lower = label.toLowerCase().trim();
  
  // Check typo mapping first
  if (MONTH_TYPOS[lower]) {
    lower = MONTH_TYPOS[lower];
  }
  
  // Check month mapping
  if (MONTH_MAP[lower]) {
    return MONTH_MAP[lower];
  }
  
  // Check quarter mapping
  if (QUARTER_MAP[lower]) {
    return QUARTER_MAP[lower];
  }
  
  // Fuzzy match for months (if distance <= 2)
  const allMonths = Object.keys(MONTH_MAP);
  for (const month of allMonths) {
    if (levenshteinDistance(lower, month) <= 2 && lower.length >= 3) {
      console.log(`📝 Typo corrected: "${label}" → "${MONTH_MAP[month]}"`);
      return MONTH_MAP[month];
    }
  }
  
  // Default: Title Case
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}

// ============================================
// UNIT INFERENCE
// ============================================

/**
 * If most values have a unit (e.g., 3 of 4 have "jt"),
 * infer the same unit for values without explicit unit.
 */
function applyUnitInference(dataset: ExtractedDataset): ExtractedDataset {
  if (dataset.dataPoints.length < 2) return dataset;
  
  // Count units by type
  const unitCounts: Record<string, number> = {};
  let noUnitCount = 0;
  
  for (const dp of dataset.dataPoints) {
    const rawValue = dp.rawValue.toLowerCase();
    if (/(?:jt|juta)$/i.test(rawValue)) {
      unitCounts['juta'] = (unitCounts['juta'] || 0) + 1;
    } else if (/(?:miliar|milyar|b)$/i.test(rawValue)) {
      unitCounts['miliar'] = (unitCounts['miliar'] || 0) + 1;
    } else if (/(?:rb|ribu|k)$/i.test(rawValue)) {
      unitCounts['ribu'] = (unitCounts['ribu'] || 0) + 1;
    } else if (/^[\d.]+$/i.test(rawValue.trim())) {
      noUnitCount++;
    }
  }
  
  // Find dominant unit (must be majority)
  const total = dataset.dataPoints.length;
  let dominantUnit: string | null = null;
  let dominantMultiplier = 1;
  
  for (const [unit, count] of Object.entries(unitCounts)) {
    if (count >= total / 2) {
      dominantUnit = unit;
      dominantMultiplier = unit === 'miliar' ? 1_000_000_000 : 
                          unit === 'juta' ? 1_000_000 :
                          unit === 'ribu' ? 1_000 : 1;
      break;
    }
  }
  
  // If there's a dominant unit and some values are without unit, apply inference
  if (dominantUnit && noUnitCount > 0 && noUnitCount < total) {
    console.log(`📊 Unit Inference: Applying "${dominantUnit}" to ${noUnitCount} values without unit`);
    
    const updatedDataPoints = dataset.dataPoints.map(dp => {
      const rawValue = dp.rawValue.toLowerCase().trim();
      // Check if this value has no unit
      if (/^[\d.]+$/.test(rawValue)) {
        // Apply the dominant unit's multiplier
        const newValue = dp.value * dominantMultiplier;
        dataset.warnings = dataset.warnings || [];
        dataset.warnings.push(`${dp.label}: satuan diasumsikan ${dominantUnit} (${dp.rawValue} → ${newValue})`);
        return {
          ...dp,
          value: newValue,
        };
      }
      return dp;
    });
    
    return {
      ...dataset,
      dataPoints: updatedDataPoints,
      detectedUnit: dominantUnit as ExtractedDataset['detectedUnit'],
    };
  }
  
  return dataset;
}

// ============================================
// MAIN PARSER
// ============================================

/**
 * Extract structured data from natural language input
 * THIS IS THE PRIMARY DATA SOURCE - NOT AI
 */
export function extractDataFromUserInput(input: string): ExtractedDataset {
  let result: ExtractedDataset = {
    success: false,
    dataPoints: [],
    detectedUnit: null,
    detectedLabels: [],
    isComparison: false,
    originalInput: input,
    parseMethod: 'none',
    warnings: [] as string[],
    errors: [] as string[],
  };
  
  console.log('📝 Data Parser V2 - Input:', input);
  
  // Detect comparison mode
  result.isComparison = /banding|compare|vs|versus|perbandingan/i.test(input);
  
  // =============================================
  // STRATEGY 1: Month + Value pattern (MOST RELIABLE)
  // "Januari 500jt, Februari 600jt, Maret 750jt"
  // =============================================
  
  const allMonths = Object.keys(MONTH_MAP).join('|');
  const allQuarters = Object.keys(QUARTER_MAP).join('|');
  const periodPattern = `(${allMonths}|${allQuarters})`;
  // Enhanced value pattern - supports 0.9B, 500jt, 750 juta, 1.500.000, plain numbers
  const valuePattern = `([\\d.,]+(?:\\s*(?:jt|juta|miliar|milyar|rb|ribu|k|m|b))?)`;
  
  // Pattern: Month/Quarter followed by separator (space, colon, comma, =, newline) then number+unit
  const monthValueRegex = new RegExp(
    `${periodPattern}[\\s:,=\\n\\r]+${valuePattern}`,
    'gi'
  );
  
  let match;
  const seenLabels = new Set<string>();
  
  while ((match = monthValueRegex.exec(input)) !== null) {
    const rawLabel = match[1];
    const rawValue = match[2];
    
    const normalizedLabel = normalizeLabel(rawLabel);
    const parsed = parseNumber(rawValue);
    
    if (parsed && !seenLabels.has(normalizedLabel.toLowerCase())) {
      result.dataPoints.push({
        label: normalizedLabel,
        value: parsed.value,
        rawValue: rawValue,
      });
      result.detectedLabels.push(normalizedLabel);
      seenLabels.add(normalizedLabel.toLowerCase());
      
      if (!result.detectedUnit && parsed.unit !== 'unit') {
        result.detectedUnit = parsed.unit as ExtractedDataset['detectedUnit'];
      }
    }
  }
  
  if (result.dataPoints.length >= 2) {
    // Unit Inference: if most values have a unit, apply to those without
    result = applyUnitInference(result);
    
    result.parseMethod = 'month_value';
    result.success = true;
    console.log('✅ Parser Strategy 1 (month_value) - Found:', result.dataPoints);
    return result;
  }
  
  // =============================================
  // STRATEGY 2: Generic Label + Value pattern
  // "Product A: 100, Product B: 200"
  // =============================================
  
  result.dataPoints = [];
  result.detectedLabels = [];
  seenLabels.clear();
  
  const labelValueRegex = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]*?)\s*[:\s]+\s*([\d.,]+\s*(?:jt|juta|miliar|milyar|rb|ribu|k|m|b)?)/gi;
  
  const fillerWords = new Set([
    'tampilkan', 'buatkan', 'buat', 'tolong', 'data', 'penjualan', 
    'grafik', 'chart', 'dan', 'atau', 'dengan', 'untuk', 'dari', 
    'ke', 'di', 'adalah', 'dalam', 'menampilkan'
  ]);
  
  while ((match = labelValueRegex.exec(input)) !== null) {
    const rawLabel = match[1].trim();
    const rawValue = match[2].trim();
    
    // Skip filler words
    if (fillerWords.has(rawLabel.toLowerCase())) continue;
    if (rawLabel.length < 2) continue;
    
    const normalizedLabel = normalizeLabel(rawLabel);
    const parsed = parseNumber(rawValue);
    
    if (parsed && !seenLabels.has(normalizedLabel.toLowerCase())) {
      result.dataPoints.push({
        label: normalizedLabel,
        value: parsed.value,
        rawValue: rawValue,
      });
      result.detectedLabels.push(normalizedLabel);
      seenLabels.add(normalizedLabel.toLowerCase());
      
      if (!result.detectedUnit && parsed.unit !== 'unit') {
        result.detectedUnit = parsed.unit as ExtractedDataset['detectedUnit'];
      }
    }
  }
  
  if (result.dataPoints.length >= 2) {
    // Unit Inference: if most values have a unit, apply to those without
    result = applyUnitInference(result);
    
    result.parseMethod = 'label_value';
    result.success = true;
    console.log('✅ Parser Strategy 2 (label_value) - Found:', result.dataPoints);
    return result;
  }
  
  // =============================================
  // STRATEGY 3: Comma/semicolon separated with implicit order
  // "500jt, 600jt, 750jt" (requires context for labels)
  // =============================================
  
  // This strategy is risky - we need external labels
  // For now, return empty and let AI handle (with validation)
  
  console.log('⚠️ Parser - No structured data found, returning empty');
  result.parseMethod = 'none';
  result.success = false;
  return result;
}

// ============================================
// CHART DATA BUILDER
// ============================================

export interface ChartDataOutput {
  action: 'show_chart';
  chart_type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  message: string;
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  source: 'internal';
  unit?: string;
  error?: {
    title: string;
    message: string;
    suggestion?: string;
  };
}

import { getDataSufficiencyInfo } from './comparison-rules';

/**
 * Convert parsed dataset to chart-ready format
 * This is DETERMINISTIC - no AI involvement
 */
export function datasetToChartData(
  dataset: ExtractedDataset,
  options?: { 
    title?: string; 
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    message?: string;
  }
): ChartDataOutput | null {
  // Check sufficiency
  const sufficiency = getDataSufficiencyInfo(dataset.dataPoints.length, dataset.isComparison);
  
  if (!sufficiency.canVisualize) {
    console.log('❌ Validation Failed:', sufficiency.warningMessage);
    // Return friendly error object that UI can render
    return {
      action: 'show_chart',
      chart_type: 'bar', // Dummy
      title: 'Data Belum Cukup',
      message: `Mohon maaf, visualisasi belum bisa dibuat. ${sufficiency.warningMessage}`,
      data: [],
      xKey: 'label',
      yKey: 'value',
      source: 'internal',
      error: {
        title: 'Data Tidak Mencukupi',
        message: sufficiency.warningMessage || 'Data tidak cukup',
        suggestion: sufficiency.tipMessage
      }
    };
  }
  
  if (!dataset.success || dataset.dataPoints.length === 0) {
    return null; // This is a parsing failure, handled elsewhere
  }
  
  // Determine xKey based on detected data
  const hasMonths = dataset.detectedLabels.some(l => 
    Object.values(MONTH_MAP).includes(l) || Object.values(QUARTER_MAP).includes(l)
  );
  
  const xKey = hasMonths ? 'month' : 'label';
  
  // Build data array with EXACT labels from user
  const data = dataset.dataPoints.map(dp => ({
    [xKey]: dp.label, // KEEP ORIGINAL LABEL
    value: dp.value,
  }));
  
  // Determine chart type based on data count and context
  let chartType: 'line' | 'bar' | 'pie' | 'area' = options?.chartType || 'bar';
  
  if (!options?.chartType) {
    // Check for market share keywords in original input
    const isMarketShare = /market.?share|pangsa.?pasar|distribusi|porsi|persentase|%/i.test(dataset.originalInput || '');
    
    if (isMarketShare) {
      chartType = 'pie';
    } else if (dataset.dataPoints.length >= 6 || hasMonths) {
      chartType = 'line'; // Trend data or time series
    } else {
      chartType = 'bar'; // Comparison default
    }
  }
  
  // Generate ACTIONABLE insight using Insight Engine
  let message: string;
  if (options?.message) {
    message = options.message;
  } else {
    // Import insight engine dynamically to avoid circular deps
    const values = dataset.dataPoints.map(dp => dp.value);
    const labels = dataset.detectedLabels;
    
    // Calculate trend stats
    const firstValue = values[0] || 0;
    const lastValue = values[values.length - 1] || 0;
    const overallChange = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
    
    // Determine trend direction
    let trend: 'naik' | 'turun' | 'stabil';
    if (overallChange > 5) trend = 'naik';
    else if (overallChange < -5) trend = 'turun';
    else trend = 'stabil';
    
    // Build actionable insight
    const changeText = overallChange >= 0 ? `+${overallChange.toFixed(1)}%` : `${overallChange.toFixed(1)}%`;
    const unitLabel = dataset.detectedUnit || '';
    
    // Summary
    let summary = `Tren ${trend} (${changeText}) dari ${labels[0]} hingga ${labels[labels.length - 1]}.`;
    
    // Recommendation based on trend
    let recommendation: string;
    if (trend === 'naik' && overallChange > 20) {
      recommendation = `💡 Pertumbuhan agresif! Rekomendasi: Tingkatkan kapasitas, optimasi proses, dan alokasi budget untuk sustain momentum.`;
    } else if (trend === 'naik') {
      recommendation = `💡 Pertumbuhan positif. Pertahankan strategi saat ini dan identifikasi faktor pendorong.`;
    } else if (trend === 'turun' && overallChange < -20) {
      recommendation = `🚨 Penurunan signifikan. Lakukan analisis mendalam: review pricing, survei pelanggan, dan evaluasi kompetitor.`;
    } else if (trend === 'turun') {
      recommendation = `⚡ Perlu perhatian. Fokus pada retensi dan evaluasi product-market fit.`;
    } else {
      recommendation = `📊 Kondisi stabil. Saat yang tepat untuk eksperimen strategi baru.`;
    }
    
    // Projection if enough data
    let projection = '';
    if (values.length >= 3 && Math.abs(overallChange) > 5) {
      const avgGrowth = overallChange / (values.length - 1);
      const nextProjected = lastValue * (1 + avgGrowth / 100);
      const formattedProjection = dataset.detectedUnit === 'juta' 
        ? `Rp${(nextProjected / 1000000).toFixed(0)} juta`
        : `Rp${nextProjected.toLocaleString('id-ID')}`;
      projection = `\n\n📈 Proyeksi: Jika pola berlanjut, periode berikutnya ~${formattedProjection}.`;
    }
    
    // Append warnings/tips from validation
    let validationTip = '';
    if (sufficiency.warningMessage) {
      validationTip = `\n\n⚠️ ${sufficiency.warningMessage}`;
    } else if (sufficiency.tipMessage) {
      validationTip = `\n\n💡 Tip: ${sufficiency.tipMessage}`;
    }
    
    message = `${summary}\n\n${recommendation}${projection}${validationTip}`;
  }
  
  return {
    action: 'show_chart',
    chart_type: chartType,
    title: options?.title || `Data ${dataset.detectedLabels[0]} - ${dataset.detectedLabels[dataset.detectedLabels.length - 1]}`,
    message,
    data,
    xKey,
    yKey: 'value',
    source: 'internal',
    unit: dataset.detectedUnit || undefined,
  };
}

// ============================================
// VALIDATION (for when AI IS used)
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate AI output against user's parsed data
 * Use this when AI provides response (not bypassed)
 */
export function validateAIAgainstParser(
  userParsed: ExtractedDataset,
  aiOutput: {
    data?: Array<Record<string, any>>;
    xKey?: string;
    yKey?: string | string[];
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!userParsed.success) {
    // No parsed data to compare against
    return { valid: true, errors: [], warnings: ['User data tidak dapat di-parse untuk validasi'] };
  }
  
  if (!aiOutput.data || !Array.isArray(aiOutput.data)) {
    errors.push('AI output tidak memiliki data array');
    return { valid: false, errors, warnings };
  }
  
  // CHECK 1: Data count must match
  if (aiOutput.data.length !== userParsed.dataPoints.length) {
    errors.push(
      `Jumlah data tidak cocok: User=${userParsed.dataPoints.length}, AI=${aiOutput.data.length}`
    );
  }
  
  // CHECK 2: All user labels must be present
  const xKey = aiOutput.xKey || Object.keys(aiOutput.data[0] || {})[0];
  const aiLabels = aiOutput.data.map(d => String(d[xKey] || '').toLowerCase());
  
  for (const userLabel of userParsed.detectedLabels) {
    const found = aiLabels.some(aiLabel => 
      aiLabel === userLabel.toLowerCase() ||
      aiLabel.includes(userLabel.toLowerCase()) ||
      userLabel.toLowerCase().includes(aiLabel)
    );
    
    if (!found) {
      errors.push(`Label "${userLabel}" dari user HILANG di output AI`);
    }
  }
  
  // CHECK 3: AI must not add labels
  for (const aiLabel of aiLabels) {
    const found = userParsed.detectedLabels.some(ul => 
      ul.toLowerCase() === aiLabel ||
      ul.toLowerCase().includes(aiLabel) ||
      aiLabel.includes(ul.toLowerCase())
    );
    
    if (!found && aiLabel.length > 0) {
      errors.push(`AI MENGARANG label "${aiLabel}" yang tidak ada di input user`);
    }
  }
  
  // CHECK 4: yKey must be single value if user only provided single values
  const yKeys = Array.isArray(aiOutput.yKey) ? aiOutput.yKey : [aiOutput.yKey];
  if (yKeys.length > 1 && !userParsed.isComparison && !userParsed.categories) {
    errors.push(`AI membuat ${yKeys.length} kategori padahal user hanya memberikan 1 nilai per periode`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
