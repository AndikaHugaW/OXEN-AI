// Production Schema Validator
// Validates parsed data before visualization

import { z } from 'zod';

// ============================================
// STRICT SCHEMAS (Zod)
// ============================================

export const DataPointSchema = z.object({
  label: z.string().min(1, 'Label tidak boleh kosong'),
  value: z.number(),
  rawValue: z.string().optional(),
});

export const DatasetSchema = z.object({
  success: z.boolean(),
  dataPoints: z.array(DataPointSchema),
  detectedLabels: z.array(z.string()),
  detectedUnit: z.enum(['juta', 'miliar', 'ribu', 'unit']).nullable(),
  parseMethod: z.string(),
  warnings: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
  requiresConfirmation: z.boolean().optional(),
});

export const ChartDataSchema = z.object({
  action: z.literal('show_chart'),
  chart_type: z.enum(['line', 'bar', 'pie', 'area']),
  title: z.string(),
  message: z.string(),
  data: z.array(z.record(z.any())),
  xKey: z.string(),
  yKey: z.string(),
  source: z.literal('internal'),
  unit: z.string().optional(),
});

export type DataPoint = z.infer<typeof DataPointSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
export type ValidatedChartData = z.infer<typeof ChartDataSchema>;

// ============================================
// SEMANTIC VALIDATORS
// ============================================

export interface SemanticValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
  requiresConfirmation: boolean;
}

/**
 * Validate data for semantic correctness
 */
export function validateSemantics(dataPoints: DataPoint[]): SemanticValidation {
  const warnings: string[] = [];
  const errors: string[] = [];
  let requiresConfirmation = false;
  
  if (dataPoints.length === 0) {
    return {
      valid: false,
      warnings: [],
      errors: ['Tidak ada data untuk divalidasi'],
      requiresConfirmation: false,
    };
  }
  
  if (dataPoints.length === 1) {
    return {
      valid: false,
      warnings: [],
      errors: ['Minimal 2 data point diperlukan untuk visualisasi'],
      requiresConfirmation: false,
    };
  }
  
  // ✅ 1. Check for negative values
  const negatives = dataPoints.filter(d => d.value < 0);
  if (negatives.length > 0) {
    warnings.push(
      `⚠️ Nilai negatif terdeteksi pada: ${negatives.map(n => `${n.label} (${n.value})`).join(', ')}`
    );
    requiresConfirmation = true;
  }
  
  // ✅ 2. Check for zero values
  const zeros = dataPoints.filter(d => d.value === 0);
  if (zeros.length > 0) {
    warnings.push(
      `${zeros.map(z => z.label).join(', ')} memiliki nilai 0 - pastikan ini benar`
    );
  }
  
  // ✅ 3. Check for outliers (more than 5x the median)
  const values = dataPoints.map(d => d.value).filter(v => v > 0);
  if (values.length >= 3) {
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    
    const outliers = dataPoints.filter(d => 
      d.value > 0 && (d.value > median * 10 || d.value < median / 10)
    );
    
    if (outliers.length > 0) {
      outliers.forEach(o => {
        const percentFromMean = ((o.value - mean) / mean * 100).toFixed(0);
        warnings.push(
          `⚠️ Outlier terdeteksi pada ${o.label} (${percentFromMean}% dari rata-rata)`
        );
      });
      requiresConfirmation = true;
    }
  }
  
  // ✅ 4. Check for duplicate labels
  const labels = dataPoints.map(d => d.label.toLowerCase());
  const duplicates = labels.filter((l, i) => labels.indexOf(l) !== i);
  if (duplicates.length > 0) {
    warnings.push(`Label duplikat terdeteksi: ${Array.from(new Set(duplicates)).join(', ')}`);
  }
  
  return {
    valid: true,
    warnings,
    errors,
    requiresConfirmation,
  };
}

// ============================================
// BUSINESS CONSISTENCY VALIDATOR
// ============================================

export interface BusinessValidation {
  trend: 'up' | 'down' | 'volatile' | 'stable';
  changePercent: number;
  isConsistent: boolean;
  suggestedInsightKeywords: string[];
  forbiddenInsightKeywords: string[];
}

/**
 * Validate business consistency between data and insight
 */
export function validateBusinessConsistency(dataPoints: DataPoint[]): BusinessValidation {
  if (dataPoints.length < 2) {
    return {
      trend: 'stable',
      changePercent: 0,
      isConsistent: true,
      suggestedInsightKeywords: [],
      forbiddenInsightKeywords: [],
    };
  }
  
  const firstValue = dataPoints[0].value;
  const lastValue = dataPoints[dataPoints.length - 1].value;
  const changePercent = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;
  
  // Count direction changes
  let upCount = 0;
  let downCount = 0;
  for (let i = 1; i < dataPoints.length; i++) {
    if (dataPoints[i].value > dataPoints[i - 1].value) upCount++;
    if (dataPoints[i].value < dataPoints[i - 1].value) downCount++;
  }
  
  // Determine trend
  let trend: BusinessValidation['trend'];
  let suggestedInsightKeywords: string[] = [];
  let forbiddenInsightKeywords: string[] = [];
  
  if (changePercent > 10 && upCount > downCount * 2) {
    trend = 'up';
    suggestedInsightKeywords = ['naik', 'pertumbuhan', 'meningkat', 'positif', 'growth'];
    forbiddenInsightKeywords = ['turun', 'penurunan', 'menurun', 'negatif', 'decline'];
  } else if (changePercent < -10 && downCount > upCount * 2) {
    trend = 'down';
    suggestedInsightKeywords = ['turun', 'penurunan', 'menurun', 'decrease'];
    forbiddenInsightKeywords = ['naik', 'pertumbuhan', 'meningkat', 'growth'];
  } else if (Math.abs(changePercent) < 5) {
    trend = 'stable';
    suggestedInsightKeywords = ['stabil', 'konsisten', 'flat', 'tetap'];
    forbiddenInsightKeywords = [];
  } else {
    trend = 'volatile';
    suggestedInsightKeywords = ['fluktuasi', 'berubah-ubah', 'volatile', 'tidak stabil'];
    forbiddenInsightKeywords = [];
  }
  
  return {
    trend,
    changePercent,
    isConsistent: true, // Will be set by insight validator
    suggestedInsightKeywords,
    forbiddenInsightKeywords,
  };
}

/**
 * Validate that insight message matches the data trend
 */
export function validateInsightConsistency(
  insight: string,
  businessValidation: BusinessValidation
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const lowerInsight = insight.toLowerCase();
  
  // Check for forbidden keywords
  for (const keyword of businessValidation.forbiddenInsightKeywords) {
    if (lowerInsight.includes(keyword.toLowerCase())) {
      issues.push(
        `Insight menyebut "${keyword}" tapi data menunjukkan tren ${businessValidation.trend} (${businessValidation.changePercent.toFixed(1)}%)`
      );
    }
  }
  
  // Check if at least one suggested keyword is present
  const hasSuggestedKeyword = businessValidation.suggestedInsightKeywords.some(
    keyword => lowerInsight.includes(keyword.toLowerCase())
  );
  
  if (!hasSuggestedKeyword && businessValidation.suggestedInsightKeywords.length > 0) {
    issues.push(
      `Insight tidak menyebutkan kata kunci yang relevan. Saran: ${businessValidation.suggestedInsightKeywords.join(', ')}`
    );
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

// ============================================
// MASTER VALIDATOR (Production Gatekeeper)
// ============================================

export interface ProductionValidation {
  stage: 'schema' | 'semantic' | 'business' | 'passed';
  passed: boolean;
  schemaValid: boolean;
  semanticValid: boolean;
  businessValid: boolean;
  warnings: string[];
  errors: string[];
  requiresConfirmation: boolean;
  canRender: boolean;
}

/**
 * Master validation function - data must pass all checks
 */
export function validateForProduction(
  dataset: unknown,
  insight?: string
): ProductionValidation {
  const result: ProductionValidation = {
    stage: 'schema',
    passed: false,
    schemaValid: false,
    semanticValid: false,
    businessValid: false,
    warnings: [],
    errors: [],
    requiresConfirmation: false,
    canRender: false,
  };
  
  // Stage 1: Schema Validation
  const schemaResult = DatasetSchema.safeParse(dataset);
  if (!schemaResult.success) {
    result.errors.push(`Schema error: ${schemaResult.error.message}`);
    return result;
  }
  result.schemaValid = true;
  
  const validatedData = schemaResult.data;
  if (!validatedData.success) {
    result.errors.push(...(validatedData.errors || ['Parser gagal']));
    return result;
  }
  
  // Stage 2: Semantic Validation
  result.stage = 'semantic';
  const semanticResult = validateSemantics(validatedData.dataPoints);
  result.semanticValid = semanticResult.valid;
  result.warnings.push(...semanticResult.warnings);
  result.errors.push(...semanticResult.errors);
  result.requiresConfirmation = semanticResult.requiresConfirmation;
  
  if (!semanticResult.valid) {
    return result;
  }
  
  // Stage 3: Business Consistency
  result.stage = 'business';
  const businessResult = validateBusinessConsistency(validatedData.dataPoints);
  
  if (insight) {
    const insightResult = validateInsightConsistency(insight, businessResult);
    result.businessValid = insightResult.valid;
    if (!insightResult.valid) {
      result.warnings.push(...insightResult.issues);
    }
  } else {
    result.businessValid = true;
  }
  
  // Final determination
  result.stage = 'passed';
  result.passed = result.schemaValid && result.semanticValid && result.businessValid;
  result.canRender = result.passed || (result.schemaValid && result.semanticValid && !result.requiresConfirmation);
  
  return result;
}
