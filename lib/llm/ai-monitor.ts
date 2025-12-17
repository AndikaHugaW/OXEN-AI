// AI Production Monitoring & Logging
// Track AI behavior, detect anomalies, and provide kill switch

export interface AILogEntry {
  timestamp: string;
  module: string;
  userInput: string;
  aiOutputValid: boolean;
  errors: string[];
  warnings: string[];
  responseTime: number;
  confidence?: 'high' | 'medium' | 'low';
  chartType?: string;
  dataPointCount?: number;
}

export interface AIMetrics {
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  errorsByModule: Record<string, number>;
  commonErrors: Array<{ error: string; count: number }>;
  recentLogs: AILogEntry[];
}

// In-memory log storage (in production, use database)
const aiLogs: AILogEntry[] = [];
const MAX_LOGS = 1000;

// Error rate tracking for kill switch
let recentErrors = 0;
let recentTotal = 0;
const ERROR_THRESHOLD = 0.5; // 50% error rate triggers concern
const CRITICAL_THRESHOLD = 0.8; // 80% error rate triggers kill switch
let killSwitchActive = false;

// ============================================
// LOGGING FUNCTIONS
// ============================================

/**
 * Log an AI interaction
 */
export function logAIInteraction(entry: AILogEntry): void {
  // Add to logs
  aiLogs.unshift(entry);
  
  // Trim if too many
  if (aiLogs.length > MAX_LOGS) {
    aiLogs.pop();
  }
  
  // Update error tracking
  recentTotal++;
  if (!entry.aiOutputValid) {
    recentErrors++;
  }
  
  // Reset counters periodically (every 100 requests)
  if (recentTotal >= 100) {
    recentErrors = Math.floor(recentErrors / 2);
    recentTotal = Math.floor(recentTotal / 2);
  }
  
  // Check kill switch condition
  const errorRate = recentTotal > 10 ? recentErrors / recentTotal : 0;
  if (errorRate >= CRITICAL_THRESHOLD && !killSwitchActive) {
    console.error('🚨 AI KILL SWITCH ACTIVATED - Error rate:', (errorRate * 100).toFixed(1) + '%');
    killSwitchActive = true;
  } else if (errorRate < ERROR_THRESHOLD && killSwitchActive) {
    console.log('✅ AI KILL SWITCH DEACTIVATED - Error rate normalized');
    killSwitchActive = false;
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const status = entry.aiOutputValid ? '✅' : '❌';
    console.log(`${status} [AI Log] ${entry.module} - ${entry.aiOutputValid ? 'Valid' : 'Invalid'}`, 
      entry.errors.length > 0 ? entry.errors : '');
  }
}

/**
 * Create a log entry helper
 */
export function createLogEntry(
  module: string,
  userInput: string,
  valid: boolean,
  errors: string[] = [],
  warnings: string[] = [],
  extras?: Partial<AILogEntry>
): AILogEntry {
  return {
    timestamp: new Date().toISOString(),
    module,
    userInput: userInput.substring(0, 200), // Truncate for storage
    aiOutputValid: valid,
    errors,
    warnings,
    responseTime: extras?.responseTime || 0,
    confidence: extras?.confidence,
    chartType: extras?.chartType,
    dataPointCount: extras?.dataPointCount,
  };
}

// ============================================
// METRICS & ANALYTICS
// ============================================

/**
 * Get AI performance metrics
 */
export function getAIMetrics(): AIMetrics {
  const validCount = aiLogs.filter(l => l.aiOutputValid).length;
  const totalResponseTime = aiLogs.reduce((sum, l) => sum + l.responseTime, 0);
  
  // Count errors by module
  const errorsByModule: Record<string, number> = {};
  aiLogs.forEach(log => {
    if (!log.aiOutputValid) {
      errorsByModule[log.module] = (errorsByModule[log.module] || 0) + 1;
    }
  });
  
  // Find common errors
  const errorCounts: Record<string, number> = {};
  aiLogs.forEach(log => {
    log.errors.forEach(error => {
      // Normalize error message
      const normalized = error.replace(/\"[^\"]+\"/g, '"..."').substring(0, 100);
      errorCounts[normalized] = (errorCounts[normalized] || 0) + 1;
    });
  });
  
  const commonErrors = Object.entries(errorCounts)
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return {
    totalRequests: aiLogs.length,
    successRate: aiLogs.length > 0 ? (validCount / aiLogs.length) * 100 : 100,
    avgResponseTime: aiLogs.length > 0 ? totalResponseTime / aiLogs.length : 0,
    errorsByModule,
    commonErrors,
    recentLogs: aiLogs.slice(0, 50),
  };
}

/**
 * Get recent error patterns for debugging
 */
export function getRecentErrors(count: number = 10): AILogEntry[] {
  return aiLogs
    .filter(log => !log.aiOutputValid)
    .slice(0, count);
}

// ============================================
// KILL SWITCH
// ============================================

/**
 * Check if AI responses should be blocked
 */
export function isKillSwitchActive(): boolean {
  return killSwitchActive;
}

/**
 * Manually toggle kill switch
 */
export function setKillSwitch(active: boolean): void {
  killSwitchActive = active;
  console.log(`🔧 AI Kill Switch manually set to: ${active}`);
}

/**
 * Get current error rate
 */
export function getCurrentErrorRate(): number {
  return recentTotal > 0 ? (recentErrors / recentTotal) * 100 : 0;
}

/**
 * Get kill switch status with details
 */
export function getKillSwitchStatus(): {
  active: boolean;
  errorRate: number;
  recentErrors: number;
  recentTotal: number;
  threshold: number;
} {
  return {
    active: killSwitchActive,
    errorRate: getCurrentErrorRate(),
    recentErrors,
    recentTotal,
    threshold: CRITICAL_THRESHOLD * 100,
  };
}

// ============================================
// FALLBACK MESSAGES
// ============================================

/**
 * Get fallback message when kill switch is active
 */
export function getKillSwitchFallbackMessage(): string {
  return `Sistem visualisasi sedang dalam mode maintenance untuk menjaga kualitas hasil. 
Silakan coba lagi dalam beberapa saat atau hubungi support jika masalah berlanjut.

Tim kami sedang bekerja untuk menyelesaikan masalah ini.`;
}

/**
 * Get module-specific fallback
 */
export function getModuleFallback(module: string): string {
  const fallbacks: Record<string, string> = {
    'data-visualization': 'Visualisasi data tidak dapat ditampilkan saat ini. Pastikan format data sudah benar.',
    'market': 'Data market sedang tidak tersedia. Silakan coba beberapa saat lagi.',
    'reports': 'Laporan tidak dapat di-generate. Silakan coba dengan data yang lebih sederhana.',
    'default': 'Layanan tidak tersedia sementara. Silakan coba lagi.',
  };
  
  return fallbacks[module] || fallbacks['default'];
}
