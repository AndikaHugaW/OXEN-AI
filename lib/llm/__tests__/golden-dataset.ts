// Golden Dataset Test Suite
// These test cases MUST pass before deployment

export interface TestCase {
  id: string;
  category: 'input_robustness' | 'deterministic' | 'semantic' | 'business_consistency' | 'silent_failure';
  name: string;
  input: string;
  expectedResult: {
    success: boolean;
    dataPoints?: Array<{ label: string; value: number }>;
    warnings?: string[];
    errors?: string[];
    requiresConfirmation?: boolean;
  };
}

export const GOLDEN_DATASET: TestCase[] = [
  // ==========================================
  // 1. INPUT ROBUSTNESS TEST (User is Chaos)
  // ==========================================
  {
    id: 'IR-001',
    category: 'input_robustness',
    name: 'Mixed unit formats (jt, juta, B)',
    input: 'Januari 500jt\nFeb 600\nMaret: 750 juta\nApril = 0.9B',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 500000000 },
        { label: 'Februari', value: 600000000 }, // Assumed jt
        { label: 'Maret', value: 750000000 },
        { label: 'April', value: 900000000 },
      ],
      warnings: ['Februari: satuan diasumsikan juta (tidak eksplisit)'],
    },
  },
  {
    id: 'IR-002',
    category: 'input_robustness',
    name: 'Typo in month names',
    input: 'Januri 500jt, Febuari 600jt, Maret 700jt',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 500000000 },
        { label: 'Februari', value: 600000000 },
        { label: 'Maret', value: 700000000 },
      ],
      warnings: ['Januri → Januari (typo corrected)', 'Febuari → Februari (typo corrected)'],
    },
  },
  {
    id: 'IR-003',
    category: 'input_robustness',
    name: 'Indonesian thousands notation (1.500.000)',
    input: 'Januari 1.500.000, Februari 2.500.000',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 1500000 },
        { label: 'Februari', value: 2500000 },
      ],
    },
  },
  {
    id: 'IR-004',
    category: 'input_robustness',
    name: 'Sentence-wrapped data',
    input: 'Tampilkan data penjualan: Januari 500jt, Februari 600jt, Maret 750jt',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 500000000 },
        { label: 'Februari', value: 600000000 },
        { label: 'Maret', value: 750000000 },
      ],
    },
  },

  // ==========================================
  // 2. DETERMINISTIC SCHEMA TEST (AI tidak boleh ngarang)
  // ==========================================
  {
    id: 'DS-001',
    category: 'deterministic',
    name: 'Exact same output for same input',
    input: 'Januari 500jt, Februari 600jt, Maret 750jt, April 900jt',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 500000000 },
        { label: 'Februari', value: 600000000 },
        { label: 'Maret', value: 750000000 },
        { label: 'April', value: 900000000 },
      ],
    },
  },
  {
    id: 'DS-002',
    category: 'deterministic',
    name: 'Label preservation (no mutations)',
    input: 'Januari 100, Februari 200, Maret 300',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 100 }, // NOT "Jan", NOT "January"
        { label: 'Februari', value: 200 },
        { label: 'Maret', value: 300 },
      ],
    },
  },

  // ==========================================
  // 3. SEMANTIC VALIDATION TEST (Masuk akal atau tidak?)
  // ==========================================
  {
    id: 'SV-001',
    category: 'semantic',
    name: 'Negative value detection',
    input: 'Januari 500jt\nFebruari -300jt\nMaret 800jt',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 500000000 },
        { label: 'Februari', value: -300000000 },
        { label: 'Maret', value: 800000000 },
      ],
      warnings: ['⚠️ Nilai negatif terdeteksi pada Februari (-300jt)'],
      requiresConfirmation: true,
    },
  },
  {
    id: 'SV-002',
    category: 'semantic',
    name: 'Extreme outlier detection',
    input: 'Januari 500jt, Februari 600jt, Maret 50000jt, April 800jt',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 500000000 },
        { label: 'Februari', value: 600000000 },
        { label: 'Maret', value: 50000000000000 },
        { label: 'April', value: 800000000 },
      ],
      warnings: ['⚠️ Outlier terdeteksi pada Maret (8233% lebih tinggi dari rata-rata)'],
      requiresConfirmation: true,
    },
  },
  {
    id: 'SV-003',
    category: 'semantic',
    name: 'Zero value handling',
    input: 'Januari 500jt, Februari 0, Maret 750jt',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 500000000 },
        { label: 'Februari', value: 0 },
        { label: 'Maret', value: 750000000 },
      ],
      warnings: ['Februari memiliki nilai 0 - pastikan ini benar'],
    },
  },

  // ==========================================
  // 4. BUSINESS CONSISTENCY TEST (CFO Mode)
  // ==========================================
  {
    id: 'BC-001',
    category: 'business_consistency',
    name: 'Consistent uptrend insight',
    input: 'Jan 500, Feb 600, Mar 750, Apr 900',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 500 },
        { label: 'Februari', value: 600 },
        { label: 'Maret', value: 750 },
        { label: 'April', value: 900 },
      ],
      // Insight MUST contain "naik" or "pertumbuhan", NOT "fluktuasi" or "turun"
    },
  },
  {
    id: 'BC-002',
    category: 'business_consistency',
    name: 'Consistent downtrend insight',
    input: 'Jan 900, Feb 750, Mar 600, Apr 500',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Januari', value: 900 },
        { label: 'Februari', value: 750 },
        { label: 'Maret', value: 600 },
        { label: 'April', value: 500 },
      ],
      // Insight MUST contain "turun" or "penurunan", NOT "naik" or "pertumbuhan"
    },
  },

  // ==========================================
  // 5. SILENT FAILURE TEST
  // ==========================================
  {
    id: 'SF-001',
    category: 'silent_failure',
    name: 'Missing data in sequence',
    input: 'Q1: 2.5M\nQ2: —\nQ3: 4.1M',
    expectedResult: {
      success: true,
      dataPoints: [
        { label: 'Q1', value: 2500000 },
        { label: 'Q3', value: 4100000 },
      ],
      warnings: ['Data Q2 tidak tersedia - visualisasi parsial ditampilkan'],
    },
  },
  {
    id: 'SF-002',
    category: 'silent_failure',
    name: 'Completely invalid input',
    input: 'hello world this is not data',
    expectedResult: {
      success: false,
      errors: ['Tidak dapat mendeteksi data numerik dalam input'],
    },
  },
  {
    id: 'SF-003',
    category: 'silent_failure',
    name: 'Single data point',
    input: 'Januari 500jt',
    expectedResult: {
      success: false,
      errors: ['Minimal 2 data point diperlukan untuk visualisasi'],
    },
  },
  {
    id: 'SF-004',
    category: 'silent_failure',
    name: 'Empty input',
    input: '',
    expectedResult: {
      success: false,
      errors: ['Input kosong'],
    },
  },
];

// ==========================================
// TEST RUNNER
// ==========================================

export interface TestResult {
  id: string;
  passed: boolean;
  expected: any;
  actual: any;
  diff?: string;
}

export function compareDataPoints(
  expected: Array<{ label: string; value: number }>,
  actual: Array<{ label: string; value: number }>
): { match: boolean; diff?: string } {
  if (expected.length !== actual.length) {
    return { match: false, diff: `Count mismatch: expected ${expected.length}, got ${actual.length}` };
  }
  
  for (let i = 0; i < expected.length; i++) {
    if (expected[i].label !== actual[i].label) {
      return { match: false, diff: `Label mismatch at ${i}: expected "${expected[i].label}", got "${actual[i].label}"` };
    }
    if (expected[i].value !== actual[i].value) {
      return { match: false, diff: `Value mismatch at ${i}: expected ${expected[i].value}, got ${actual[i].value}` };
    }
  }
  
  return { match: true };
}
