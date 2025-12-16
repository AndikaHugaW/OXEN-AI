// Utility functions to generate chart data for business visualizations

import { ChartData } from '@/components/ChartRenderer';
import { TableData } from '@/components/DataTable';

export interface VisualizationData {
  chart?: ChartData;
  table?: TableData;
}

// Keywords that indicate the user wants a visualization
// Made more strict - only explicit visualization requests
export function needsVisualization(query: string): boolean {
  const queryLower = query.toLowerCase().trim();
  
  // Must contain explicit visualization action verbs
  const explicitActions = [
    'tampilkan grafik', 'tampilkan chart', 'tampilkan tabel', 'tampilkan data',
    'buat grafik', 'buat chart', 'buat tabel',
    'show chart', 'show graph', 'show table', 'show data',
    'create chart', 'create graph', 'create table',
    'lihat grafik', 'lihat chart', 'lihat tabel',
    'display chart', 'display graph', 'display table',
    'generate chart', 'generate graph',
    'visualisasi', 'visualization', 'visualize',
    'tampilkan visualisasi', 'show visualization'
  ];
  
  // Check for explicit visualization requests (must include action verb)
  const hasExplicitAction = explicitActions.some(action => queryLower.includes(action));
  if (hasExplicitAction) {
    return true;
  }
  
  // Specific chart type requests (must explicitly mention chart type)
  const chartTypeKeywords = [
    'pie chart', 'bar chart', 'line chart', 'area chart',
    'composed chart', 'radar chart', 'scatter chart',
    'grafik pie', 'grafik bar', 'grafik line', 'grafik area',
    'data table', 'tabel data'
  ];
  
  const hasChartType = chartTypeKeywords.some(keyword => queryLower.includes(keyword));
  if (hasChartType) {
    return true;
  }
  
  // Very specific patterns - only when explicitly asking for data visualization
  const specificPatterns = [
    /^tampilkan.*(grafik|chart|tabel|data).*(sales|penjualan|pendapatan|revenue|financial|keuangan|saham|kripto|bitcoin|btc|eth)/i,
    /^buat.*(grafik|chart|tabel).*(sales|penjualan|pendapatan|revenue|financial|keuangan|saham|kripto)/i,
    /^(show|display|lihat|analisis).*(grafik|chart|tabel|visualisasi).*(sales|penjualan|pendapatan|revenue|financial|keuangan|saham|kripto|bitcoin|btc|eth|tesla|aapl)/i,
    /(grafik|chart|tabel).*(penjualan|sales|revenue|pendapatan|financial|keuangan|market share|pangsa pasar|saham|kripto)/i,
    /(analisis|tampilkan|lihat).*(saham|stock|kripto|crypto|bitcoin|btc|ethereum|eth).*(chart|grafik|harga|price|trend)/i,
  ];
  
  // Only match if query starts with action verb or contains both chart/table AND data keywords
  return specificPatterns.some(pattern => {
    const match = pattern.test(query);
    // Additional check: query should not be just general business questions
    if (match) {
      // Exclude general questions that don't need visualization
      const excludePatterns = [
        /^(bagaimana|how|what|apa|mengapa|why)/i,
        /^(jelaskan|explain|ceritakan|tell)/i,
        /^(strategi|strategy|cara|how to)/i,
      ];
      return !excludePatterns.some(exclude => exclude.test(query.trim()));
    }
    return false;
  });
}

// ⚠️ DISABLED: Sample data generation is NOT ALLOWED
// All data MUST be fetched from real APIs (market data, business APIs, etc.)
// This function is kept for reference but will always return null
export function generateBusinessChartData(query: string): ChartData | null {
  // ⚠️ PERINGATAN: JANGAN GUNAKAN SAMPLE DATA
  // Semua data HARUS diambil dari API yang sebenarnya
  // Jika user meminta chart/visualisasi, sistem HARUS mengambil data dari API
  console.warn('⚠️ [Chart Generator] generateBusinessChartData called - Sample data is DISABLED. All data must come from real APIs.');
  return null;
  
  // OLD CODE DISABLED - DO NOT USE SAMPLE DATA
  /*
  const queryLower = query.toLowerCase().trim();
  
  // Don't generate if query is too vague or just asking questions
  if (queryLower.length < 10 || 
      /^(bagaimana|how|what|apa|mengapa|why|jelaskan|explain)/i.test(queryLower)) {
    return null;
  }

  // Area Chart for cumulative data
  if (queryLower.includes('area') || queryLower.includes('kumulatif') || 
      queryLower.includes('cumulative') || queryLower.includes('akumulasi')) {
    return {
      type: 'area',
      title: 'Cumulative Performance',
      data: [
        { month: 'Jan', sales: 45000, target: 50000 },
        { month: 'Feb', sales: 52000, target: 50000 },
        { month: 'Mar', sales: 48000, target: 55000 },
        { month: 'Apr', sales: 61000, target: 55000 },
        { month: 'May', sales: 55000, target: 60000 },
        { month: 'Jun', sales: 67000, target: 60000 },
      ],
      xKey: 'month',
      yKey: ['sales', 'target'],
    };
  }

  // Composed Chart (mixed bar and line)
  if (queryLower.includes('composed') || queryLower.includes('gabungan') ||
      queryLower.includes('mixed') || queryLower.includes('kombinasi') ||
      (queryLower.includes('revenue') && queryLower.includes('expense'))) {
    return {
      type: 'composed',
      title: 'Revenue vs Expenses Comparison',
      data: [
        { month: 'Jan', revenue: 120000, expenses: 95000, profit: 25000 },
        { month: 'Feb', revenue: 135000, expenses: 98000, profit: 37000 },
        { month: 'Mar', revenue: 150000, expenses: 105000, profit: 45000 },
        { month: 'Apr', revenue: 165000, expenses: 110000, profit: 55000 },
        { month: 'May', revenue: 180000, expenses: 115000, profit: 65000 },
        { month: 'Jun', revenue: 195000, expenses: 120000, profit: 75000 },
      ],
      xKey: 'month',
      yKey: ['revenue', 'expenses', 'profit'],
      series: [
        { key: 'revenue', type: 'bar', name: 'Revenue' },
        { key: 'expenses', type: 'bar', name: 'Expenses' },
        { key: 'profit', type: 'line', name: 'Profit' },
      ],
    };
  }

  // Radar Chart for multi-dimensional analysis
  if (queryLower.includes('radar') || queryLower.includes('spider') ||
      queryLower.includes('performance') && queryLower.includes('multi')) {
    return {
      type: 'radar',
      title: 'Performance Radar Analysis',
      data: [
        { category: 'Sales', value: 85, target: 90 },
        { category: 'Marketing', value: 72, target: 80 },
        { category: 'Customer', value: 88, target: 85 },
        { category: 'Operations', value: 75, target: 75 },
        { category: 'Finance', value: 90, target: 85 },
        { category: 'HR', value: 80, target: 80 },
      ],
      xKey: 'category',
      yKey: ['value', 'target'],
    };
  }

  // Scatter Chart for correlation analysis
  if (queryLower.includes('scatter') || queryLower.includes('korelasi') ||
      queryLower.includes('correlation') || queryLower.includes('hubungan')) {
    return {
      type: 'scatter',
      title: 'Correlation Analysis',
      data: [
        { marketing: 50, sales: 45000 },
        { marketing: 60, sales: 52000 },
        { marketing: 55, sales: 48000 },
        { marketing: 70, sales: 61000 },
        { marketing: 65, sales: 55000 },
        { marketing: 75, sales: 67000 },
        { marketing: 80, sales: 72000 },
        { marketing: 85, sales: 78000 },
      ],
      xKey: 'marketing',
      yKey: ['sales'],
    };
  }

  // Sales/Trend Analysis - Line Chart
  if (queryLower.includes('sales') || queryLower.includes('penjualan') || 
      queryLower.includes('trend') || queryLower.includes('growth') || 
      queryLower.includes('pertumbuhan')) {
    return {
      type: 'line',
      title: 'Sales Trend Analysis',
      data: [
        { month: 'Jan', sales: 45000, target: 50000 },
        { month: 'Feb', sales: 52000, target: 50000 },
        { month: 'Mar', sales: 48000, target: 55000 },
        { month: 'Apr', sales: 61000, target: 55000 },
        { month: 'May', sales: 55000, target: 60000 },
        { month: 'Jun', sales: 67000, target: 60000 },
        { month: 'Jul', sales: 72000, target: 65000 },
        { month: 'Aug', sales: 68000, target: 65000 },
        { month: 'Sep', sales: 75000, target: 70000 },
        { month: 'Oct', sales: 81000, target: 70000 },
        { month: 'Nov', sales: 78000, target: 75000 },
        { month: 'Dec', sales: 92000, target: 75000 },
      ],
      xKey: 'month',
      yKey: 'sales',
    };
  }

  // Department/Product Comparison - Bar Chart
  if (queryLower.includes('department') || queryLower.includes('departemen') ||
      queryLower.includes('product') || queryLower.includes('produk') ||
      queryLower.includes('perbandingan') || queryLower.includes('comparison')) {
    return {
      type: 'bar',
      title: 'Department Performance Comparison',
      data: [
        { department: 'Sales', revenue: 450000, target: 400000 },
        { department: 'Marketing', revenue: 320000, target: 350000 },
        { department: 'HR', revenue: 180000, target: 200000 },
        { department: 'IT', revenue: 280000, target: 300000 },
        { department: 'Finance', revenue: 250000, target: 250000 },
        { department: 'Operations', revenue: 390000, target: 380000 },
      ],
      xKey: 'department',
      yKey: 'revenue',
    };
  }

  // Market Share / Distribution - Pie Chart
  if (queryLower.includes('market share') || queryLower.includes('pangsa pasar') ||
      queryLower.includes('distribusi') || queryLower.includes('distribution') ||
      queryLower.includes('persentase') || queryLower.includes('percentage')) {
    return {
      type: 'pie',
      title: 'Market Share Distribution',
      data: [
        { name: 'Product A', value: 35 },
        { name: 'Product B', value: 28 },
        { name: 'Product C', value: 20 },
        { name: 'Product D', value: 12 },
        { name: 'Others', value: 5 },
      ],
      xKey: 'name',
      yKey: 'value',
      dataKey: 'value',
    };
  }

  // Financial Analysis - Bar Chart
  if (queryLower.includes('financial') || queryLower.includes('keuangan') ||
      queryLower.includes('budget') || queryLower.includes('anggaran') ||
      queryLower.includes('revenue') || queryLower.includes('pendapatan')) {
    return {
      type: 'bar',
      title: 'Financial Overview by Quarter',
      data: [
        { quarter: 'Q1', revenue: 1200000, expenses: 950000, profit: 250000 },
        { quarter: 'Q2', revenue: 1350000, expenses: 980000, profit: 370000 },
        { quarter: 'Q3', revenue: 1500000, expenses: 1050000, profit: 450000 },
        { quarter: 'Q4', revenue: 1650000, expenses: 1100000, profit: 550000 },
      ],
      xKey: 'quarter',
      yKey: 'revenue',
    };
  }

  // Customer Analysis - Line Chart
  if (queryLower.includes('customer') || queryLower.includes('pelanggan') ||
      queryLower.includes('user') || queryLower.includes('pengguna')) {
    return {
      type: 'line',
      title: 'Customer Growth Over Time',
      data: [
        { period: '2023 Q1', customers: 1250, newCustomers: 150 },
        { period: '2023 Q2', customers: 1420, newCustomers: 170 },
        { period: '2023 Q3', customers: 1580, newCustomers: 160 },
        { period: '2023 Q4', customers: 1750, newCustomers: 170 },
        { period: '2024 Q1', customers: 1920, newCustomers: 170 },
        { period: '2024 Q2', customers: 2100, newCustomers: 180 },
      ],
      xKey: 'period',
      yKey: 'customers',
    };
  }

  // No default chart - only return if specific type detected
  return null;
  */
}

// ⚠️ DISABLED: Sample table data generation is NOT ALLOWED
// All data MUST be fetched from real APIs (market data, business APIs, etc.)
// This function is kept for reference but will always return null
export function generateTableData(query: string): TableData | null {
  // ⚠️ PERINGATAN: JANGAN GUNAKAN SAMPLE DATA
  // Semua data HARUS diambil dari API yang sebenarnya
  // Jika user meminta tabel/visualisasi, sistem HARUS mengambil data dari API
  console.warn('⚠️ [Chart Generator] generateTableData called - Sample data is DISABLED. All data must come from real APIs.');
  return null;
  
  // OLD CODE DISABLED - DO NOT USE SAMPLE DATA
  /*
  const queryLower = query.toLowerCase().trim();
  
  // Must explicitly mention table/tabel
  if (!queryLower.includes('tabel') && !queryLower.includes('table') && 
      !queryLower.includes('data table') && !queryLower.includes('tabel data')) {
    return null;
  }

  // Table for detailed data view
  if (queryLower.includes('table') || queryLower.includes('tabel') ||
      queryLower.includes('data table') || queryLower.includes('tabel data') ||
      queryLower.includes('tampilkan tabel') || queryLower.includes('show table') ||
      queryLower.includes('detailed') || queryLower.includes('rincian')) {
    return {
      title: 'Detailed Data Table',
      data: [
        { department: 'Sales', revenue: 450000, employees: 25, avgRevenue: 18000 },
        { department: 'Marketing', revenue: 320000, employees: 18, avgRevenue: 17778 },
        { department: 'HR', revenue: 180000, employees: 12, avgRevenue: 15000 },
        { department: 'IT', revenue: 280000, employees: 20, avgRevenue: 14000 },
        { department: 'Finance', revenue: 250000, employees: 15, avgRevenue: 16667 },
        { department: 'Operations', revenue: 390000, employees: 28, avgRevenue: 13929 },
      ],
      columns: ['department', 'revenue', 'employees', 'avgRevenue'],
    };
  }

  return null;
  */
}

// Detect chart type from user query
export function detectChartType(query: string): 'candlestick' | 'line' | 'bar' | 'pie' | 'area' {
  const queryLower = query.toLowerCase();
  
  // Priority order: explicit mentions first
  if (queryLower.includes('line chart') || queryLower.includes('grafik line') || queryLower.includes('line graph')) {
    return 'line';
  }
  if (queryLower.includes('bar chart') || queryLower.includes('grafik bar') || queryLower.includes('bar graph')) {
    return 'bar';
  }
  if (queryLower.includes('pie chart') || queryLower.includes('grafik pie')) {
    return 'pie';
  }
  if (queryLower.includes('area chart') || queryLower.includes('grafik area')) {
    return 'area';
  }
  if (queryLower.includes('candlestick') || queryLower.includes('candle')) {
    return 'candlestick';
  }
  
  // Default for stocks/crypto is candlestick
  return 'candlestick';
}

// Detect if query is about stocks/crypto - MORE SENSITIVE
export function isMarketDataRequest(query: string): { isMarket: boolean; symbol?: string; type?: 'crypto' | 'stock'; days?: number; chartType?: 'candlestick' | 'line' | 'bar' | 'pie' | 'area' } {
  const queryLower = query.toLowerCase().trim();
  
  // Map full names to symbols
  const cryptoMap: Record<string, string> = {
    'bitcoin': 'btc',
    'ethereum': 'eth',
    'binance': 'bnb',
    'binance coin': 'bnb',
    'solana': 'sol',
    'cardano': 'ada',
    'ripple': 'xrp',
    'polkadot': 'dot',
    'polygon': 'matic',
    'avalanche': 'avax',
    'dogecoin': 'doge',
    'litecoin': 'ltc',
    'chainlink': 'link',
    'cosmos': 'atom',
    'tron': 'trx',
  };
  
  const stockMap: Record<string, string> = {
    // US Stocks
    'apple': 'aapl',
    'microsoft': 'msft',
    'google': 'googl',
    'amazon': 'amzn',
    'tesla': 'tsla',
    'facebook': 'meta',
    'nvidia': 'nvda',
    'meta': 'meta',
    // Indonesian Stocks - Banks
    'goto': 'goto',
    'gojek': 'goto',
    'tokopedia': 'goto',
    'bca': 'bbca',
    'bank central asia': 'bbca',
    'central asia': 'bbca',
    'bri': 'bbri',
    'bank rakyat indonesia': 'bbri',
    'bni': 'bbni',
    'bank negara indonesia': 'bbni',
    'mandiri': 'bmri',
    'bank mandiri': 'bmri',
    'bukopin': 'bbca',
    // Indonesian Stocks - Telecommunications
    'telkom': 'tlkm',
    'telkomsel': 'tlkm',
    'xl axiata': 'excl',
    'indosat': 'isat',
    // Indonesian Stocks - Consumer Goods
    'astra': 'asii',
    'astra international': 'asii',
    'unilever': 'unvr',
    'indofood': 'icbp',
    'indofood sukses makmur': 'icbp',
    'indofood cbp': 'icbp',
    // Indonesian Stocks - Energy
    'perusahaan gas negara': 'pgas',
    'pgn': 'pgas',
    'pertamina': 'ptba',
    'adaro': 'adro',
    // Indonesian Stocks - Others
    'kalbe': 'klbf',
    'kalbe farma': 'klbf',
    'gudang garam': 'ggrm',
    'semen indonesia': 'smgr',
    'indocement': 'inbp',
  };
  
  // Common crypto symbols
  // NOTE: "sol" is removed to avoid matching "solusi" - use "solana" instead
  const cryptoKeywords = ['btc', 'bitcoin', 'eth', 'ethereum', 'bnb', 'binance', 'solana',
    'ada', 'cardano', 'xrp', 'ripple', 'dot', 'polkadot', 'matic', 'polygon',
    'avax', 'avalanche', 'doge', 'dogecoin', 'ltc', 'litecoin', 'link', 'chainlink',
    'atom', 'cosmos', 'trx', 'tron'];
  
  // Common stock symbols
  const stockKeywords = [
    // US Stocks
    'aapl', 'apple', 'msft', 'microsoft', 'googl', 'google', 'amzn', 'amazon',
    'tsla', 'tesla', 'meta', 'facebook', 'nvda', 'nvidia',
    // Indonesian Stocks - Banks
    'goto', 'gojek', 'tokopedia', 
    'bca', 'bbca', 'bank central asia',
    'bri', 'bbri', 'bank rakyat indonesia',
    'bni', 'bbni', 'bank negara indonesia',
    'bmri', 'mandiri', 'bank mandiri',
    // Indonesian Stocks - Telecommunications
    'tlkm', 'telkom', 'telkomsel',
    'excl', 'xl axiata',
    'isat', 'indosat',
    // Indonesian Stocks - Consumer Goods
    'asii', 'astra', 'astra international',
    'unvr', 'unilever',
    'icbp', 'indofood', 'indofood sukses makmur',
    // Indonesian Stocks - Energy
    'pgas', 'perusahaan gas negara', 'pgn',
    'adro', 'adaro',
    // Indonesian Stocks - Others
    'klbf', 'kalbe', 'kalbe farma',
    'ggrm', 'gudang garam',
    'smgr', 'semen indonesia'
  ];
  
  // Extract timeframe/days (default 7)
  // Supports: "7 hari", "1 bulan", "2 minggu", "1 year", shorthand "1D/7D/1W/1M/3M/6M/1Y", "YTD", "MAX"
  let days = 7;

  // Keyword-based timeframes
  if (/\bytd\b/.test(queryLower)) {
    // YTD: approx days since start of year (fallback 365 if parsing fails)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    days = Math.max(1, Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)));
  } else if (/\bmax\b/.test(queryLower)) {
    days = 3650; // 10 years
  } else {
    // Shorthand: 1d, 7d, 1w, 1m, 3m, 6m, 1y (also accept uppercase)
    const short = queryLower.match(/\b(\d+)\s*(d|w|m|y)\b/i);
    if (short) {
      const n = parseInt(short[1]);
      const unit = short[2].toLowerCase();
      if (unit === 'd') days = n;
      if (unit === 'w') days = n * 7;
      if (unit === 'm') days = n * 30;
      if (unit === 'y') days = n * 365;
    } else {
      // Natural language: hari/minggu/bulan/tahun (id/en)
      const m = queryLower.match(/(\d+)\s*(hari|day|days|minggu|week|weeks|bulan|month|months|tahun|year|years)/);
      if (m) {
        const n = parseInt(m[1]);
        const unit = m[2];
        if (unit.startsWith('hari') || unit.startsWith('day')) days = n;
        else if (unit.startsWith('minggu') || unit.startsWith('week')) days = n * 7;
        else if (unit.startsWith('bulan') || unit.startsWith('month')) days = n * 30;
        else if (unit.startsWith('tahun') || unit.startsWith('year')) days = n * 365;
      }
    }
  }

  // Clamp for sanity (data sources may still cap internally)
  if (days > 3650) days = 3650;
  if (days < 1) days = 1;
  
  // Detect chart type
  const chartType = detectChartType(query);
  
  // EXCLUDE general business questions that don't need market data
  // If query is about business problems, strategy, or general questions, it's NOT a market request
  const businessQuestionPatterns = [
    /^(aku|saya|kami|kita|perusahaan|bisnis|produk|produkku|produk saya).*(masalah|problem|issue|kurang|tidak|belum|gimana|bagaimana|tolong|bisa|mau|ingin)/i,
    /^(gimana|bagaimana|tolong|bisa|mau|ingin).*(cara|strategi|solusi|solution|analisis|analysis|masalah|problem)/i,
    /^(jelaskan|explain|ceritakan|tell).*(apa|what|mengapa|why|bagaimana|how)/i,
    /(produk|product|masalah|problem|solusi|solution|strategi|strategy|bisnis|business|perusahaan|company).*(kurang|tidak|belum|gimana|bagaimana|tolong|bisa|mau|ingin)/i,
    // Business data analysis patterns
    /(?:identifikasi|identify|analisis|analysis|trend|tren|data|penjualan|sales|revenue|pendapatan|keuangan|financial|bisnis|business|perusahaan|company|produk|product|customer|pelanggan|marketing|operasional|operational).*(?:dari|from|dengan|with|metode|method|cara|how|bagaimana|gimana)/i,
    /(?:cara|how|bagaimana|gimana|metode|method).*(?:identifikasi|identify|analisis|analysis|trend|tren|data|penjualan|sales|revenue|pendapatan|keuangan|financial|bisnis|business)/i,
  ];
  
  // CRITICAL: Check for business words that might be confused with crypto symbols
  const businessWords = [
    'solusi', 'solution', 'ada masalah', 'ada problem', 'ada issue', 
    'kasih solusi', 'beri solusi', 'memberikan solusi',
    'data penjualan', 'sales data', 'penjualan', 'sales', 'revenue', 'pendapatan',
    'identifikasi trend', 'identify trend', 'trend penjualan', 'sales trend',
    'metode valid', 'valid method', 'cara identifikasi', 'how to identify',
    'analisis bisnis', 'business analysis', 'analisis data', 'data analysis'
  ];
  const hasBusinessWord = businessWords.some(bw => queryLower.includes(bw));
  
  // Check for business data analysis keywords (NOT market data)
  const businessDataKeywords = [
    'data penjualan', 'sales data', 'data bisnis', 'business data',
    'trend penjualan', 'sales trend', 'trend bisnis', 'business trend',
    'identifikasi trend', 'identify trend', 'analisis penjualan', 'sales analysis',
    'metode valid', 'valid method', 'cara identifikasi', 'how to identify'
  ];
  const hasBusinessDataKeyword = businessDataKeywords.some(kw => queryLower.includes(kw));
  
  // If it matches business question patterns OR contains business words, it's NOT a market request
  if (businessQuestionPatterns.some(pattern => pattern.test(query)) || hasBusinessWord || hasBusinessDataKeyword) {
    // UNLESS it explicitly mentions stock/crypto symbols WITH action words
    const hasExplicitSymbolWithAction = /(?:tampilkan|analisis|chart|grafik|harga|price|data|lihat|show|perlihatkan|buat|create)\s+(?:bitcoin|btc|ethereum|eth|binance|bnb|solana|cardano|ada|xrp|ripple|polkadot|dot|polygon|matic|avalanche|avax|dogecoin|doge|litecoin|ltc|chainlink|link|cosmos|atom|tron|trx|apple|aapl|microsoft|msft|google|googl|amazon|amzn|tesla|tsla|facebook|meta|nvidia|nvda|goto|gojek|tokopedia)/i.test(query);
    
    if (!hasExplicitSymbolWithAction) {
      // Definitely a business question, not a market request
      return { isMarket: false };
    }
  }
  
  // Check for crypto - check full names first - MUST be explicit
  for (const [fullName, symbol] of Object.entries(cryptoMap)) {
    if (queryLower.includes(fullName)) {
      // MUST have explicit action word OR be in explicit pattern
      const hasExplicitAction = /(?:tampilkan|analisis|chart|grafik|harga|price|data|lihat|show|perlihatkan|buat|create)\s+/i.test(query);
      const isInExplicitPattern = /(?:analisis|chart|grafik|harga|price|data|tampilkan|lihat|show)\s+(?:bitcoin|btc|ethereum|eth|binance|bnb|solana|sol|cardano|ada|xrp|ripple|polkadot|dot|polygon|matic|avalanche|avax|dogecoin|doge|litecoin|ltc|chainlink|link|cosmos|atom|tron|trx)/i.test(query);
      
      if (hasExplicitAction || isInExplicitPattern) {
        return { isMarket: true, symbol: symbol.toUpperCase(), type: 'crypto', days, chartType };
      }
    }
  }
  
  // Check for crypto symbols - MUST be explicit with action words
  for (const keyword of cryptoKeywords) {
    if (queryLower.includes(keyword)) {
      // Skip if it's just general "crypto" mention without symbol
      if ((keyword === 'kripto' || keyword === 'crypto' || keyword === 'cryptocurrency') && 
          !/(?:analisis|chart|grafik|harga|price|data|tampilkan|lihat|show)\s+[a-z]{2,10}/i.test(query)) {
        continue;
      }
      
      // MUST have explicit action word (tampilkan, analisis, chart, harga, etc.) OR be in pattern
      const hasExplicitAction = /(?:tampilkan|analisis|chart|grafik|harga|price|data|lihat|show|perlihatkan|buat|create)\s+/i.test(query);
      const isInPattern = /(?:analisis|chart|grafik|harga|price|data|tampilkan|lihat|show)\s+[a-z]{2,10}/i.test(query);
      
      // CRITICAL: Skip common words that might match but aren't market requests
      // "sol" might match "solusi", "ada" might match "ada masalah", "dot" might match other words
      if (keyword.length <= 3) {
        // For short keywords, check if it's part of a business word or business context
        const businessWords = [
          'solusi', 'solution', 'kasih solusi', 'beri solusi', 'memberikan solusi', 
          'ada masalah', 'ada problem', 'ada issue', 'ada data', 'ada penjualan',
          'data penjualan', 'sales data', 'identifikasi', 'identify', 'metode', 'method'
        ];
        const isPartOfBusinessWord = businessWords.some(bw => queryLower.includes(bw));
        
        // Special case for "ada" - check if it's in business context
        if (keyword === 'ada') {
          // If "ada" appears in business context (data, penjualan, masalah, etc.), skip it
          if (/(?:ada\s+(?:data|penjualan|sales|masalah|problem|issue|trend|tren|metode|method|identifikasi|identify|cara|how))/i.test(query)) {
            // It's business context, not Cardano
            continue;
          }
          // If "ada" appears with action word but in business context, still skip
          if (/(?:identifikasi|identify|analisis|analysis|trend|tren|data|penjualan|sales).*(?:dari|from|dengan|with|metode|method)/i.test(query)) {
            // Business data analysis, not Cardano
            continue;
          }
        }
        
        // If it's part of a business word, ALWAYS skip (even with action word, unless explicitly "solana" or "sol" with action)
        if (isPartOfBusinessWord) {
          // Special case: if keyword is "sol" and query explicitly says "solana" or "sol" with action word, allow it
          if (keyword === 'sol' && (queryLower.includes('solana') || (hasExplicitAction && /(?:tampilkan|analisis|chart|grafik|harga|price|data|lihat|show)\s+sol\b/i.test(query)))) {
            // Allow only if explicitly "solana" or "sol" with action word AND not part of "solusi"
            if (!queryLower.includes('solusi') && !queryLower.includes('solution')) {
              // Continue to check action word below
            } else {
              // It's "solusi", not Solana
              continue;
            }
          } else {
            // It's likely part of a business word, not a crypto symbol
            continue;
          }
        }
        
        // Only accept short keywords if explicitly mentioned with action word
        if (!hasExplicitAction && !isInPattern) {
          continue;
        }
      }
      
      if (hasExplicitAction || isInPattern) {
        return { isMarket: true, symbol: keyword.toUpperCase(), type: 'crypto', days, chartType };
      }
    }
  }
  
  // Check for stocks - check full names first - MUST be explicit
  for (const [fullName, symbol] of Object.entries(stockMap)) {
    if (queryLower.includes(fullName)) {
      // MUST have explicit action word
      const hasExplicitAction = /(?:tampilkan|analisis|chart|grafik|harga|price|data|lihat|show|perlihatkan|buat|create)\s+/i.test(query);
      if (hasExplicitAction) {
        return { isMarket: true, symbol: symbol.toUpperCase(), type: 'stock', days, chartType };
      }
    }
  }
  
  // Check for stock symbols - MUST be explicit
  for (const keyword of stockKeywords) {
    if (queryLower.includes(keyword)) {
      // MUST have explicit action word
      const hasExplicitAction = /(?:tampilkan|analisis|chart|grafik|harga|price|data|lihat|show|perlihatkan|buat|create)\s+/i.test(query);
      if (hasExplicitAction) {
        return { isMarket: true, symbol: keyword.toUpperCase(), type: 'stock', days, chartType };
      }
    }
  }
  
  // Pattern matching for "analisis BTC", "chart Bitcoin", "harga ETH"
  // MUST have explicit action word followed by symbol
  // CRITICAL: Exclude "sol" from pattern to avoid matching "solusi" - only use "solana"
  const cryptoPattern = /(?:analisis|chart|grafik|harga|price|data|tampilkan|lihat|show|perlihatkan|buat|create)\s+(bitcoin|btc|ethereum|eth|binance|bnb|solana|cardano|ada|xrp|ripple|polkadot|polygon|matic|avalanche|avax|dogecoin|doge|litecoin|ltc|chainlink|link|cosmos|atom|tron|trx)/i;
  const cryptoMatch = queryLower.match(cryptoPattern);
  if (cryptoMatch) {
    const found = cryptoMatch[1].toLowerCase();
    
    // CRITICAL: "sol" should NEVER match if it's part of "solusi" or "solution"
    // CRITICAL: "ada" should NEVER match if it's in business context
    if (found === 'sol') {
      // Check if "sol" is part of "solusi" or "solution"
      const solusiPattern = /(?:solusi|solution|kasih solusi|beri solusi|memberikan solusi)/i;
      if (solusiPattern.test(query)) {
        // It's "solusi", not Solana - skip
        // Don't return, continue to check other patterns
      } else if (queryLower.includes('solana')) {
        // Explicitly "solana", allow it
        const symbol = cryptoMap['solana'] || 'SOL';
        return { isMarket: true, symbol: symbol.toUpperCase(), type: 'crypto', days, chartType };
      } else if (/(?:analisis|chart|grafik|harga|price|data|tampilkan|lihat|show)\s+sol\b/i.test(query)) {
        // Explicitly "sol" with action word, allow it
        const symbol = cryptoMap[found] || found;
        return { isMarket: true, symbol: symbol.toUpperCase(), type: 'crypto', days, chartType };
      } else {
        // "sol" without clear context, skip to avoid false positive
        // Don't return, continue to check other patterns
      }
    } else if (found === 'ada') {
      // Check if "ada" is in business context
      const businessContextPattern = /(?:ada\s+(?:data|penjualan|sales|masalah|problem|issue|trend|tren|metode|method|identifikasi|identify|cara|how))/i;
      const businessDataPattern = /(?:identifikasi|identify|analisis|analysis|trend|tren|data|penjualan|sales).*(?:dari|from|dengan|with|metode|method)/i;
      
      if (businessContextPattern.test(query) || businessDataPattern.test(query)) {
        // It's business context, not Cardano - skip
        // Don't return, continue to check other patterns
      } else if (queryLower.includes('cardano')) {
        // Explicitly "cardano", allow it
        const symbol = cryptoMap['cardano'] || 'ADA';
        return { isMarket: true, symbol: symbol.toUpperCase(), type: 'crypto', days, chartType };
      } else if (/(?:analisis|chart|grafik|harga|price|data|tampilkan|lihat|show)\s+ada\b/i.test(query)) {
        // Explicitly "ada" with action word, allow it
        const symbol = cryptoMap[found] || found;
        return { isMarket: true, symbol: symbol.toUpperCase(), type: 'crypto', days, chartType };
      } else {
        // "ada" without clear context, skip to avoid false positive
        // Don't return, continue to check other patterns
      }
    } else {
      // Not "sol" or "ada", proceed normally
      const symbol = cryptoMap[found] || found;
      return { isMarket: true, symbol: symbol.toUpperCase(), type: 'crypto', days, chartType };
    }
  }
  
  const stockPattern = /(?:analisis|chart|grafik|harga|price|data|tampilkan|lihat|show|perlihatkan|buat|create)\s+(apple|aapl|microsoft|msft|google|googl|amazon|amzn|tesla|tsla|facebook|meta|nvidia|nvda|goto|gojek|tokopedia)/i;
  const stockMatch = queryLower.match(stockPattern);
  if (stockMatch) {
    const found = stockMatch[1].toLowerCase();
    const symbol = stockMap[found] || found;
    return { isMarket: true, symbol: symbol.toUpperCase(), type: 'stock', days, chartType };
  }
  
  return { isMarket: false };
}

// Extract multiple crypto/stock symbols from text
export function extractMultipleSymbols(text: string): Array<{ symbol: string; type: 'crypto' | 'stock' }> {
  const symbols: Array<{ symbol: string; type: 'crypto' | 'stock' }> = [];
  const textLower = text.toLowerCase();
  
  // Crypto map
  const cryptoMap: Record<string, string> = {
    'bitcoin': 'btc',
    'ethereum': 'eth',
    'binance': 'bnb',
    'binance coin': 'bnb',
    'solana': 'sol',
    'cardano': 'ada',
    'xrp': 'xrp',
    'ripple': 'xrp',
    'polkadot': 'dot',
    'polygon': 'matic',
    'avalanche': 'avax',
    'dogecoin': 'doge',
    'litecoin': 'ltc',
    'chainlink': 'link',
    'cosmos': 'atom',
    'tron': 'trx',
  };
  
  // Stock map
  const stockMap: Record<string, string> = {
    'apple': 'aapl',
    'microsoft': 'msft',
    'google': 'googl',
    'amazon': 'amzn',
    'tesla': 'tsla',
    'facebook': 'meta',
    'nvidia': 'nvda',
    'goto': 'goto',
    'bri': 'bbri',
    'bank rakyat indonesia': 'bbri',
    'bni': 'bbni',
    'bank negara indonesia': 'bbni',
    'bca': 'bbca',
    'bank central asia': 'bbca',
  };
  
  // Find all crypto mentions (case insensitive)
  const cryptoSymbols = ['btc', 'eth', 'bnb', 'sol', 'ada', 'xrp', 'dot', 'matic', 'avax', 'doge', 'ltc', 'link', 'atom', 'trx'];
  const foundSymbols = new Set<string>();
  
  // Check for crypto symbols (improved detection)
  for (const sym of cryptoSymbols) {
    // Match whole word only (avoid matching "bitcoin" when looking for "btc")
    // Also match if followed by comma, "dan", "and", "vs", "versus", etc.
    const regex = new RegExp(`\\b${sym}\\b`, 'i');
    if (regex.test(text)) {
      foundSymbols.add(sym.toUpperCase());
      symbols.push({ symbol: sym.toUpperCase(), type: 'crypto' });
    }
  }
  
  // Also check for patterns like "BTC dan ETH", "BTC, ETH", "BTC vs ETH"
  const cryptoPairPattern = /\b(btc|eth|sol|bnb|ada|xrp|dot|matic|avax|doge|ltc|link|atom|trx)\s*(?:,|dan|and|&|vs|versus)\s*(btc|eth|sol|bnb|ada|xrp|dot|matic|avax|doge|ltc|link|atom|trx)\b/gi;
  let match;
  while ((match = cryptoPairPattern.exec(text)) !== null) {
    const sym1 = match[1].toUpperCase();
    const sym2 = match[2].toUpperCase();
    if (!foundSymbols.has(sym1)) {
      foundSymbols.add(sym1);
      symbols.push({ symbol: sym1, type: 'crypto' });
    }
    if (!foundSymbols.has(sym2)) {
      foundSymbols.add(sym2);
      symbols.push({ symbol: sym2, type: 'crypto' });
    }
  }
  
  // Check for crypto full names
  for (const [name, sym] of Object.entries(cryptoMap)) {
    if (textLower.includes(name) && !foundSymbols.has(sym.toUpperCase())) {
      foundSymbols.add(sym.toUpperCase());
      symbols.push({ symbol: sym.toUpperCase(), type: 'crypto' });
    }
  }
  
  // Check for stock symbols (map BCA to BBCA)
  const stockSymbols = ['aapl', 'msft', 'googl', 'amzn', 'tsla', 'meta', 'nvda', 'goto', 'bbca', 'bbri', 'bbni', 'bri', 'bni'];
  const stockSymbolMap: Record<string, string> = {
    'bca': 'BBCA',
    'bbca': 'BBCA',
    'bri': 'BBRI',
    'bbri': 'BBRI',
    'bni': 'BBNI',
    'bbni': 'BBNI',
  };
  
  for (const sym of stockSymbols) {
    const regex = new RegExp(`\\b${sym}\\b`, 'i');
    if (regex.test(text) && !foundSymbols.has(sym.toUpperCase())) {
      foundSymbols.add(sym.toUpperCase());
      // Map BCA to BBCA
      const mappedSymbol = stockSymbolMap[sym.toLowerCase()] || sym.toUpperCase();
      symbols.push({ symbol: mappedSymbol, type: 'stock' });
    }
  }
  
  // Special case: handle "bca" separately (not in stockSymbols to avoid conflict)
  const bcaRegex = new RegExp(`\\bbca\\b`, 'i');
  if (bcaRegex.test(text) && !foundSymbols.has('BBCA')) {
    foundSymbols.add('BBCA');
    symbols.push({ symbol: 'BBCA', type: 'stock' });
  }
  
  // Check for stock full names
  for (const [name, sym] of Object.entries(stockMap)) {
    if (textLower.includes(name) && !foundSymbols.has(sym.toUpperCase())) {
      foundSymbols.add(sym.toUpperCase());
      symbols.push({ symbol: sym.toUpperCase(), type: 'stock' });
    }
  }
  
  return symbols;
}

// Generate market data visualization (async)
export async function generateMarketVisualization(query: string): Promise<ChartData | null> {
  const marketInfo = isMarketDataRequest(query);
  
  if (!marketInfo.isMarket || !marketInfo.symbol) {
    return null;
  }

  try {
    // Import data fetcher directly instead of using API route (for server-side)
    const { fetchCryptoData, fetchStockData, calculateIndicators } = await import('@/lib/market/data-fetcher');
    
    let marketData;
    if (marketInfo.type === 'crypto') {
      marketData = await fetchCryptoData(marketInfo.symbol, marketInfo.days || 7);
    } else {
      marketData = await fetchStockData(marketInfo.symbol, marketInfo.days || 7);
    }
    
    const indicators = calculateIndicators(marketData.data);
    const symbol = marketInfo.symbol;


    // Format data for candlestick chart
    const candlestickData = marketData.data.map((item) => ({
      time: item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));

    return {
      type: 'candlestick',
      title: `${symbol} Price Chart (${marketInfo.days || 7} days)`,
      data: candlestickData,
      xKey: 'time',
      yKey: 'close',
      symbol: symbol,
      currentPrice: marketData.currentPrice,
      change24h: marketData.change24h,
      asset_type: marketInfo.type || 'crypto',
    };
  } catch (error) {
    console.error('Error generating market visualization:', error);
    return null;
  }
}

// Generate visualization (chart or table)
// ⚠️ IMPORTANT: Only uses real API data, NO SAMPLE DATA
export async function generateVisualization(query: string): Promise<VisualizationData> {
  // Check for market data first (real API data)
  const marketChart = await generateMarketVisualization(query);
  if (marketChart) {
    return {
      chart: marketChart,
      table: undefined,
    };
  }

  // ⚠️ NO FALLBACK TO SAMPLE DATA
  // If market data is not available, return empty
  // All data MUST come from real APIs
  console.warn('⚠️ [Chart Generator] No market data found for query. Sample data is DISABLED. Data must come from real APIs.');
  
  return {
    chart: undefined,
    table: undefined,
  };
}

// Parse chart data from LLM response (if LLM returns structured data)
export function parseChartFromResponse(response: string): ChartData | null {
  try {
    // Look for JSON chart data in the response
    const chartMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (chartMatch) {
      const chartData = JSON.parse(chartMatch[1]);
      if (chartData.type && chartData.data) {
        return chartData as ChartData;
      }
    }
  } catch (error) {
    console.warn('Failed to parse chart from response:', error);
  }
  return null;
}

// Check if user wants an image (for future image generation support)
export function needsImage(query: string): boolean {
  const imageKeywords = [
    'gambar', 'image', 'foto', 'photo', 'picture', 'illustration',
    'tampilkan gambar', 'show image', 'generate image', 'buat gambar',
    'visual', 'diagram visual', 'infographic'
  ];
  
  return imageKeywords.some(keyword => 
    query.toLowerCase().includes(keyword)
  );
}

// Generate image URL or data (placeholder - can be extended with actual image generation API)
export async function generateImageUrl(query: string): Promise<string | null> {
  // Placeholder - in the future, this can call DALL-E, Stable Diffusion, etc.
  // For now, return null to indicate image generation is not yet implemented
  return null;
}
