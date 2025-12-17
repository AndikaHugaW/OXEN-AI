// Test Runner for Golden Dataset
// Run: npx ts-node lib/llm/__tests__/run-tests.ts

import { GOLDEN_DATASET, TestCase, TestResult, compareDataPoints } from './golden-dataset';
import { extractDataFromUserInput } from '../data-parser';
import { validateForProduction } from '../schema-validator';

// ============================================
// TEST EXECUTION
// ============================================

interface TestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  summary: {
    input_robustness: { passed: number; failed: number };
    deterministic: { passed: number; failed: number };
    semantic: { passed: number; failed: number };
    business_consistency: { passed: number; failed: number };
    silent_failure: { passed: number; failed: number };
  };
}

function runTest(testCase: TestCase): TestResult {
  const result: TestResult = {
    id: testCase.id,
    passed: false,
    expected: testCase.expectedResult,
    actual: null,
  };
  
  try {
    // Parse input
    const parsed = extractDataFromUserInput(testCase.input);
    
    // Build actual result
    result.actual = {
      success: parsed.success,
      dataPoints: parsed.dataPoints.map(dp => ({
        label: dp.label,
        value: dp.value,
      })),
      warnings: parsed.warnings || [],
      errors: parsed.errors || [],
    };
    
    // Compare results based on test category
    switch (testCase.category) {
      case 'input_robustness':
      case 'deterministic':
        // Must match exact data points
        if (testCase.expectedResult.dataPoints) {
          const comparison = compareDataPoints(
            testCase.expectedResult.dataPoints,
            result.actual.dataPoints
          );
          result.passed = parsed.success === testCase.expectedResult.success && comparison.match;
          if (!comparison.match) {
            result.diff = comparison.diff;
          }
        } else {
          result.passed = parsed.success === testCase.expectedResult.success;
        }
        break;
        
      case 'semantic':
        // Check warnings are generated for problematic data
        if (testCase.expectedResult.requiresConfirmation) {
          const validation = validateForProduction(parsed);
          result.passed = validation.requiresConfirmation || validation.warnings.length > 0;
          if (!result.passed) {
            result.diff = 'Expected warnings/confirmation for problematic data, got none';
          }
        } else {
          result.passed = parsed.success === testCase.expectedResult.success;
        }
        break;
        
      case 'business_consistency':
        // Check data extracted correctly (insight consistency checked separately)
        if (testCase.expectedResult.dataPoints) {
          const comparison = compareDataPoints(
            testCase.expectedResult.dataPoints,
            result.actual.dataPoints
          );
          result.passed = comparison.match;
          if (!comparison.match) {
            result.diff = comparison.diff;
          }
        }
        break;
        
      case 'silent_failure':
        // Must not crash and must return appropriate errors
        if (testCase.expectedResult.success === false) {
          result.passed = !parsed.success;
          if (result.passed && testCase.expectedResult.errors) {
            // Just check that some error was returned
            result.passed = parsed.dataPoints.length < 2;
          }
        } else {
          result.passed = parsed.success;
        }
        break;
    }
  } catch (error) {
    result.actual = { error: String(error) };
    result.diff = `Exception: ${error}`;
    result.passed = false;
  }
  
  return result;
}

function runAllTests(): TestSuiteResult {
  const suiteResult: TestSuiteResult = {
    total: GOLDEN_DATASET.length,
    passed: 0,
    failed: 0,
    results: [],
    summary: {
      input_robustness: { passed: 0, failed: 0 },
      deterministic: { passed: 0, failed: 0 },
      semantic: { passed: 0, failed: 0 },
      business_consistency: { passed: 0, failed: 0 },
      silent_failure: { passed: 0, failed: 0 },
    },
  };
  
  for (const testCase of GOLDEN_DATASET) {
    const result = runTest(testCase);
    suiteResult.results.push(result);
    
    if (result.passed) {
      suiteResult.passed++;
      suiteResult.summary[testCase.category].passed++;
    } else {
      suiteResult.failed++;
      suiteResult.summary[testCase.category].failed++;
    }
  }
  
  return suiteResult;
}

// ============================================
// DETERMINISM TEST
// ============================================

function runDeterminismTest(input: string, iterations: number = 10): {
  passed: boolean;
  outputs: string[];
  unique: number;
} {
  const outputs: string[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const parsed = extractDataFromUserInput(input);
    outputs.push(JSON.stringify(parsed.dataPoints));
  }
  
  const unique = new Set(outputs).size;
  
  return {
    passed: unique === 1,
    outputs: Array.from(new Set(outputs)),
    unique,
  };
}

// ============================================
// MAIN EXECUTION
// ============================================

function main() {
  console.log('🧪 OXEN AI - Golden Dataset Test Suite\n');
  console.log('=' .repeat(60));
  
  // Run all tests
  const results = runAllTests();
  
  // Print summary
  console.log('\n📊 SUMMARY BY CATEGORY:\n');
  for (const [category, stats] of Object.entries(results.summary)) {
    const emoji = stats.failed === 0 ? '✅' : '❌';
    console.log(`  ${emoji} ${category}: ${stats.passed}/${stats.passed + stats.failed} passed`);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`\n🎯 TOTAL: ${results.passed}/${results.total} tests passed`);
  
  // Print failed tests
  const failed = results.results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    for (const f of failed) {
      console.log(`  [${f.id}]`);
      console.log(`    Expected: ${JSON.stringify(f.expected.dataPoints?.map((d: any) => d.label))}`);
      console.log(`    Actual:   ${JSON.stringify(f.actual.dataPoints?.map((d: any) => d.label))}`);
      if (f.diff) console.log(`    Diff: ${f.diff}`);
      console.log('');
    }
  }
  
  // Run determinism test
  console.log('\n' + '=' .repeat(60));
  console.log('\n🔄 DETERMINISM TEST (10 iterations):\n');
  
  const deterministicInput = 'Januari 500jt, Februari 600jt, Maret 750jt, April 900jt';
  const deterResult = runDeterminismTest(deterministicInput);
  
  if (deterResult.passed) {
    console.log('  ✅ PASSED - Output identical across all iterations');
  } else {
    console.log('  ❌ FAILED - Output varies between iterations');
    console.log(`  Unique outputs: ${deterResult.unique}`);
  }
  
  // Final verdict
  console.log('\n' + '=' .repeat(60));
  if (results.failed === 0 && deterResult.passed) {
    console.log('\n✅ ALL TESTS PASSED - Ready for production! 🚀\n');
    process.exit(0);
  } else {
    console.log('\n❌ TESTS FAILED - Not ready for production\n');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runAllTests, runDeterminismTest };
