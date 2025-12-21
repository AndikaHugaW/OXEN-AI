// Insight Engine - AI-powered business insights
// Generates actionable recommendations, not just descriptions

// ============================================
// CONFIGURATION CONSTANTS (Magic Numbers)
// ============================================

const THRESHOLDS = {
  // Growth thresholds (percentage)
  HIGH_GROWTH: 20,
  MODERATE_GROWTH: 10,
  SIGNIFICANT_DECLINE: -20,
  FLAT_RANGE: 5,           // ±5% considered flat
  DIRECTION_CHANGE: 2,     // ±2% to count as up/down
  
  // Consistency thresholds (0-1)
  HIGH_CONSISTENCY: 0.7,
  MEDIUM_CONSISTENCY: 0.4,
  PREDICTION_THRESHOLD: 0.5,
  
  // Data requirements
  MIN_DATA_HIGH_CONFIDENCE: 6,
  MIN_DATA_MEDIUM_CONFIDENCE: 3,
  MIN_DATA_PREDICTION: 3,
} as const;

// ============================================
// INTERFACES
// ============================================

export interface InsightData {
  values: number[];
  labels: string[];
  unit?: 'juta' | 'miliar' | 'ribu' | 'unit' | null;
  context?: 'penjualan' | 'revenue' | 'expense' | 'profit' | 'growth' | 'general';
  currency?: 'IDR' | 'USD'; // Support multi-currency
}

export interface GeneratedInsight {
  summary: string;           // Short trend description
  recommendation: string;    // Actionable advice
  prediction?: string;       // Optional future projection
  alerts?: string[];         // Warning flags if any
  confidence: 'high' | 'medium' | 'low';
}

// ============================================
// TREND ANALYSIS
// ============================================

interface TrendAnalysis {
  direction: 'up' | 'down' | 'flat' | 'volatile';
  overallChange: number;      // Percentage change first to last
  avgGrowth: number;          // Average period-over-period growth
  consistency: number;        // 0-1, how consistent is the trend
  highPoint: { label: string; value: number; index: number };
  lowPoint: { label: string; value: number; index: number };
  lastChange: number;         // Last period change percentage
}

/**
 * Safe percentage change calculation
 * Handles zero, negative, and edge cases
 */
function safePercentageChange(current: number, previous: number): number {
  // If previous is zero, avoid division by zero
  if (previous === 0) {
    return current > 0 ? 100 : current < 0 ? -100 : 0;
  }
  
  // Handle negative to positive or vice versa transitions
  if (previous < 0 && current >= 0) {
    // From loss to profit: calculate improvement
    return Math.abs(current - previous) / Math.abs(previous) * 100;
  }
  
  if (previous > 0 && current < 0) {
    // From profit to loss: calculate decline
    return -Math.abs(current - previous) / Math.abs(previous) * 100;
  }
  
  // Normal calculation
  return ((current - previous) / Math.abs(previous)) * 100;
}

function analyzeTrend(data: InsightData): TrendAnalysis {
  const { values, labels } = data;
  const n = values.length;
  
  if (n < 2) {
    return {
      direction: 'flat',
      overallChange: 0,
      avgGrowth: 0,
      consistency: 1,
      highPoint: { label: labels[0], value: values[0], index: 0 },
      lowPoint: { label: labels[0], value: values[0], index: 0 },
      lastChange: 0,
    };
  }
  
  // Overall change (use safe calculation)
  const firstValue = values[0];
  const lastValue = values[n - 1];
  const overallChange = safePercentageChange(lastValue, firstValue);
  
  // Period-over-period changes
  const changes: number[] = [];
  for (let i = 1; i < n; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    const change = safePercentageChange(curr, prev);
    changes.push(change);
  }
  
  const avgGrowth = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
  const lastChange = changes.length > 0 ? changes[changes.length - 1] : 0;
  
  // Direction (using threshold constants)
  let direction: TrendAnalysis['direction'];
  const positiveChanges = changes.filter(c => c > THRESHOLDS.DIRECTION_CHANGE).length;
  const negativeChanges = changes.filter(c => c < -THRESHOLDS.DIRECTION_CHANGE).length;
  
  if (positiveChanges > negativeChanges * 2) {
    direction = 'up';
  } else if (negativeChanges > positiveChanges * 2) {
    direction = 'down';
  } else if (Math.abs(overallChange) < THRESHOLDS.FLAT_RANGE) {
    direction = 'flat';
  } else {
    direction = 'volatile';
  }
  
  // Consistency (standard deviation of changes)
  const avgChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
  const variance = changes.length > 0 
    ? changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length 
    : 0;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, 1 - (stdDev / 100)); // Normalize to 0-1
  
  // High/Low points
  let highIndex = 0, lowIndex = 0;
  for (let i = 1; i < n; i++) {
    if (values[i] > values[highIndex]) highIndex = i;
    if (values[i] < values[lowIndex]) lowIndex = i;
  }
  
  return {
    direction,
    overallChange,
    avgGrowth,
    consistency,
    highPoint: { label: labels[highIndex], value: values[highIndex], index: highIndex },
    lowPoint: { label: labels[lowIndex], value: values[lowIndex], index: lowIndex },
    lastChange,
  };
}

// ============================================
// VALUE FORMATTING (Modern Intl.NumberFormat)
// ============================================

/**
 * Format number for display using modern Intl.NumberFormat
 * Supports compact notation (1M, 1jt, etc.) and multi-currency
 */
function formatValue(value: number, unit?: string | null, currency: 'IDR' | 'USD' = 'IDR'): string {
  try {
    // Use compact notation for large numbers
    const formatter = new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      maximumFractionDigits: 1,
      compactDisplay: 'short'
    });
    
    return formatter.format(value);
  } catch (e) {
    // Fallback for older environments
    if (value >= 1_000_000_000) {
      return `Rp${(value / 1_000_000_000).toFixed(1)} M`;
    }
    if (value >= 1_000_000) {
      return `Rp${(value / 1_000_000).toFixed(0)} jt`;
    }
    if (value >= 1_000) {
      return `Rp${(value / 1_000).toFixed(0)} rb`;
    }
    return new Intl.NumberFormat('id-ID').format(value);
  }
}

// ============================================
// INSIGHT GENERATION
// ============================================

/**
 * Generate business insight with recommendations
 */
export function generateInsight(data: InsightData): GeneratedInsight {
  const trend = analyzeTrend(data);
  const alerts: string[] = [];
  
  // Detect context from values pattern
  const context = data.context || 'general';
  
  // =============================================
  // SUMMARY GENERATION
  // =============================================
  
  let summary: string;
  const changeText = trend.overallChange >= 0 ? `+${trend.overallChange.toFixed(1)}%` : `${trend.overallChange.toFixed(1)}%`;
  const currency = data.currency || 'IDR';
  
  switch (trend.direction) {
    case 'up':
      summary = `Tren ${context === 'expense' ? 'kenaikan biaya' : 'pertumbuhan'} positif (${changeText}) dari ${data.labels[0]} hingga ${data.labels[data.labels.length - 1]}.`;
      if (trend.consistency > THRESHOLDS.HIGH_CONSISTENCY) {
        summary += ` Pertumbuhan berlangsung stabil dan konsisten.`;
      }
      break;
      
    case 'down':
      summary = `Tren ${context === 'expense' ? 'penurunan biaya' : 'penurunan'} (${changeText}) dari ${data.labels[0]} hingga ${data.labels[data.labels.length - 1]}.`;
      if (context !== 'expense') {
        alerts.push('⚠️ Penurunan perlu diinvestigasi');
      }
      break;
      
    case 'volatile':
      summary = `Data menunjukkan fluktuasi dengan perubahan keseluruhan ${changeText}. Titik tertinggi di ${trend.highPoint.label} (${formatValue(trend.highPoint.value, data.unit, currency)}), terendah di ${trend.lowPoint.label}.`;
      alerts.push('📊 Pola tidak konsisten - perlu analisis lebih dalam');
      break;
      
    default:
      summary = `Data relatif stabil (${changeText}) dari ${data.labels[0]} hingga ${data.labels[data.labels.length - 1]}.`;
  }
  
  // =============================================
  // RECOMMENDATION GENERATION
  // =============================================
  
  let recommendation: string;
  
  if (trend.direction === 'up' && context !== 'expense') {
    if (trend.avgGrowth > THRESHOLDS.HIGH_GROWTH) {
      recommendation = `💡 Pertumbuhan agresif! Rekomendasi: (1) Tingkatkan kapasitas produksi/stok, (2) Alokasikan budget marketing untuk sustain momentum, (3) Siapkan rekrutmen tim jika diperlukan.`;
    } else if (trend.avgGrowth > THRESHOLDS.MODERATE_GROWTH) {
      recommendation = `💡 Pertumbuhan sehat. Rekomendasi: Pertahankan strategi saat ini, optimalkan operational efficiency untuk margin lebih baik.`;
    } else {
      recommendation = `💡 Pertumbuhan moderat. Rekomendasi: Evaluasi strategi akuisisi pelanggan baru untuk akselerasi.`;
    }
  } else if (trend.direction === 'down' && context !== 'expense') {
    if (trend.overallChange < THRESHOLDS.SIGNIFICANT_DECLINE) {
      recommendation = `🚨 Penurunan signifikan memerlukan tindakan segera: (1) Review pricing strategy, (2) Analisis kompetitor, (3) Survei kepuasan pelanggan, (4) Identifikasi channel underperforming.`;
    } else {
      recommendation = `⚡ Penurunan perlu diperhatikan. Rekomendasi: Fokus pada retensi pelanggan existing dan evaluasi product-market fit.`;
    }
  } else if (trend.direction === 'up' && context === 'expense') {
    recommendation = `⚠️ Biaya meningkat ${changeText}. Rekomendasi: Audit expense categories, negosiasi ulang vendor contracts, identifikasi operational waste.`;
    alerts.push('💰 Margin mungkin tertekan');
  } else if (trend.direction === 'down' && context === 'expense') {
    recommendation = `✅ Efisiensi biaya berhasil! Pastikan kualitas layanan tidak terdampak. Monitor customer satisfaction.`;
  } else if (trend.direction === 'volatile') {
    recommendation = `📈 Pola fluktuatif menunjukkan seasonality atau external factors. Rekomendasi: (1) Identifikasi penyebab volatilitas, (2) Buat buffer inventory/cash untuk periode rendah, (3) Maksimalkan periode peak.`;
  } else {
    recommendation = `📊 Kondisi stabil. Ini saat yang tepat untuk eksperimen strategi baru tanpa risiko besar.`;
  }
  
  // =============================================
  // PREDICTION (Simple Linear Projection)
  // =============================================
  
  let prediction: string | undefined;
  
  if (data.values.length >= THRESHOLDS.MIN_DATA_PREDICTION && trend.consistency > THRESHOLDS.PREDICTION_THRESHOLD) {
    const lastValue = data.values[data.values.length - 1];
    const projectedValue = lastValue * (1 + trend.avgGrowth / 100);
    
    if (trend.direction === 'up') {
      prediction = `📈 Proyeksi: Jika pola berlanjut, periode berikutnya berpotensi mencapai ${formatValue(projectedValue, data.unit, currency)}.`;
    } else if (trend.direction === 'down') {
      prediction = `📉 Proyeksi: Tanpa intervensi, periode berikutnya mungkin turun ke ${formatValue(projectedValue, data.unit, currency)}.`;
    }
  }
  
  // =============================================
  // CONFIDENCE LEVEL
  // =============================================
  
  let confidence: GeneratedInsight['confidence'];
  if (data.values.length >= THRESHOLDS.MIN_DATA_HIGH_CONFIDENCE && trend.consistency > THRESHOLDS.HIGH_CONSISTENCY) {
    confidence = 'high';
  } else if (data.values.length >= THRESHOLDS.MIN_DATA_MEDIUM_CONFIDENCE && trend.consistency > THRESHOLDS.MEDIUM_CONSISTENCY) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  return {
    summary,
    recommendation,
    prediction,
    alerts: alerts.length > 0 ? alerts : undefined,
    confidence,
  };
}

/**
 * Generate full insight message for chart display
 */
export function generateInsightMessage(data: InsightData): string {
  const insight = generateInsight(data);
  
  let message = insight.summary;
  
  if (insight.alerts) {
    message += '\n\n' + insight.alerts.join('\n');
  }
  
  message += '\n\n' + insight.recommendation;
  
  if (insight.prediction) {
    message += '\n\n' + insight.prediction;
  }
  
  return message;
}
