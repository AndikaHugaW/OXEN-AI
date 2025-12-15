/**
 * Shared utility functions for timeframe conversion
 * Ensures consistency between frontend and backend
 */

/**
 * Convert timeframe string to number of days
 * This function is used by both frontend and backend to ensure consistency
 */
export function timeframeToDays(timeframe: string): number {
  const mapping: Record<string, number> = {
    '1D': 1,
    '5D': 5,
    '1M': 30,
    '6M': 180,
    'YTD': calculateYTDDays(),
    '1Y': 365,
    '5Y': 1825,
    'MAX': 365 * 10, // 10 years max
  };
  
  return mapping[timeframe] || 7; // Default to 7 days if unknown
}

/**
 * Calculate days from start of year to today (Year To Date)
 */
function calculateYTDDays(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1); // January 1st
  const diffTime = now.getTime() - startOfYear.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get all available timeframes
 */
export function getAvailableTimeframes(): string[] {
  return ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'];
}

/**
 * Validate timeframe string
 */
export function isValidTimeframe(timeframe: string): boolean {
  return getAvailableTimeframes().includes(timeframe);
}

/**
 * Get human-readable description of timeframe
 */
export function getTimeframeDescription(timeframe: string): string {
  const descriptions: Record<string, string> = {
    '1D': '1 Day',
    '5D': '5 Days',
    '1M': '1 Month',
    '6M': '6 Months',
    'YTD': 'Year To Date',
    '1Y': '1 Year',
    '5Y': '5 Years',
    'MAX': 'Maximum (10 Years)',
  };
  
  return descriptions[timeframe] || timeframe;
}

