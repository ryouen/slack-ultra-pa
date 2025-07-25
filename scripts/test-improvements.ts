import { config } from '../src/config/environment';
import { safeJsonParse } from '../src/utils/jsonHelpers';
import { validateSlackUserId, validateSlackChannelId, RateLimiter } from '../src/utils/validation';
import { logger } from '../src/utils/logger';

/**
 * Test script to verify all code improvements work correctly
 * This ensures no breaking changes from refactoring
 */

console.log('🧪 Starting Code Improvement Tests...\n');

// Test 1: Safe JSON Parsing
console.log('1️⃣ Testing Safe JSON Parsing...');
const testJsonCases = [
  { input: '{"valid": true}', expected: { valid: true } },
  { input: 'invalid json', expected: {} },
  { input: null, expected: {} },
  { input: undefined, expected: {} },
  { input: '{"metadata": {"priority": "P1"}}', expected: { metadata: { priority: "P1" } } },
];

let jsonTestsPassed = 0;
testJsonCases.forEach((testCase, index) => {
  const result = safeJsonParse(testCase.input as any, {});
  const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
  if (passed) {
    jsonTestsPassed++;
  } else {
    console.error(`  ❌ Test ${index + 1} failed:`, { input: testCase.input, expected: testCase.expected, got: result });
  }
});
console.log(`  ✅ JSON Tests: ${jsonTestsPassed}/${testJsonCases.length} passed\n`);

// Test 2: Validation Functions
console.log('2️⃣ Testing Validation Functions...');
const validationTests = [
  { fn: validateSlackUserId, input: 'U123ABC456', expected: true },
  { fn: validateSlackUserId, input: 'invalid', expected: false },
  { fn: validateSlackChannelId, input: 'C123ABC456', expected: true },
  { fn: validateSlackChannelId, input: 'D123ABC456', expected: true },
  { fn: validateSlackChannelId, input: 'invalid', expected: false },
];

let validationTestsPassed = 0;
validationTests.forEach((test, index) => {
  const result = test.fn(test.input);
  if (result === test.expected) {
    validationTestsPassed++;
  } else {
    console.error(`  ❌ Validation test ${index + 1} failed:`, { input: test.input, expected: test.expected, got: result });
  }
});
console.log(`  ✅ Validation Tests: ${validationTestsPassed}/${validationTests.length} passed\n`);

// Test 3: Rate Limiter
console.log('3️⃣ Testing Rate Limiter...');
const rateLimiter = new RateLimiter(3, 1000); // 3 requests per second
let rateLimiterPassed = true;

// Should allow first 3 requests
for (let i = 0; i < 3; i++) {
  if (!rateLimiter.tryAcquire('test-user')) {
    console.error('  ❌ Rate limiter blocked request', i + 1);
    rateLimiterPassed = false;
  }
}

// 4th request should be blocked
if (rateLimiter.tryAcquire('test-user')) {
  console.error('  ❌ Rate limiter allowed 4th request');
  rateLimiterPassed = false;
}

// Different user should be allowed
if (!rateLimiter.tryAcquire('different-user')) {
  console.error('  ❌ Rate limiter blocked different user');
  rateLimiterPassed = false;
}

console.log(rateLimiterPassed ? '  ✅ Rate Limiter: All tests passed\n' : '  ❌ Rate Limiter: Some tests failed\n');

// Test 4: Environment Config Access
console.log('4️⃣ Testing Environment Config...');
let configTestsPassed = 0;
const configTests = [
  { name: 'Slack Bot Token', value: config.slack.botToken, shouldExist: true },
  { name: 'Database URL', value: config.database.url, shouldExist: true },
  { name: 'OpenAI Config', value: config.openai, shouldExist: !!process.env.OPENAI_API_KEY },
];

configTests.forEach(test => {
  const exists = !!test.value;
  if (exists === test.shouldExist) {
    configTestsPassed++;
  } else {
    console.error(`  ❌ ${test.name} test failed:`, { expected: test.shouldExist, got: exists });
  }
});
console.log(`  ✅ Config Tests: ${configTestsPassed}/${configTests.length} passed\n`);

// Test 5: Import Resolution
console.log('5️⃣ Testing Import Resolution...');
let importTestsPassed = 0;
const importTests = [
  { name: 'jsonHelpers', module: () => require('../src/utils/jsonHelpers') },
  { name: 'validation', module: () => require('../src/utils/validation') },
  { name: 'errorHandling', module: () => require('../src/utils/errorHandling') },
];

importTests.forEach(test => {
  try {
    test.module();
    importTestsPassed++;
  } catch (error) {
    console.error(`  ❌ Failed to import ${test.name}:`, error.message);
  }
});
console.log(`  ✅ Import Tests: ${importTestsPassed}/${importTests.length} passed\n`);

// Summary
const totalTests = jsonTestCases.length + validationTests.length + 1 + configTests.length + importTests.length;
const totalPassed = jsonTestsPassed + validationTestsPassed + (rateLimiterPassed ? 1 : 0) + configTestsPassed + importTestsPassed;

console.log('📊 Test Summary:');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${totalPassed}`);
console.log(`Failed: ${totalTests - totalPassed}`);
console.log(`Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`);

if (totalPassed === totalTests) {
  console.log('\n✅ All tests passed! Code improvements are working correctly.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please review the output above.');
  process.exit(1);
}