import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { routeGrievance, loadKb } from '../src/engine/router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runRoutingBenchmark() {
  const testsPath = path.resolve(__dirname, '../data/tests.json');
  const tests = JSON.parse(fs.readFileSync(testsPath, 'utf8'));

  console.log('===============================================================');
  console.log(`HAQ SAATHI: KNOWLEDGE BASE ROUTING BENCHMARK (${tests.length} TEST CASES)`);
  console.log('===============================================================\n');

  let totalCases = tests.length;
  let totalCorrect = 0;

  let verifiedCases = 0;
  let verifiedCorrect = 0;

  let unverifiedCases = 0;
  let unverifiedCorrect = 0;

  const failures = [];
  const results = [];

  for (const test of tests) {
    const route = routeGrievance(test.input);
    const passed = route.category_id === test.expected_category;

    if (passed) {
      totalCorrect++;
    } else {
      failures.push({
        id: test.id,
        persona: test.persona,
        inputSnippet: test.input.slice(0, 60) + '...',
        expected: test.expected_category,
        got: route.category_id,
        confidence: route.confidence,
        is_verified: test.is_verified
      });
    }

    if (test.is_verified) {
      verifiedCases++;
      if (passed) verifiedCorrect++;
    } else {
      unverifiedCases++;
      if (passed) unverifiedCorrect++;
    }

    results.push({
      id: test.id,
      expected: test.expected_category,
      got: route.category_id,
      confidence: route.confidence,
      passed,
      is_verified: test.is_verified
    });
  }

  const overallAccuracy = (totalCorrect / totalCases) * 100;
  const verifiedAccuracy = verifiedCases > 0 ? (verifiedCorrect / verifiedCases) * 100 : 0;
  const unverifiedAccuracy = unverifiedCases > 0 ? (unverifiedCorrect / unverifiedCases) * 100 : 0;

  console.log(`Total Cases:              ${totalCases}`);
  console.log(`Overall Correct:          ${totalCorrect}/${totalCases} (${overallAccuracy.toFixed(1)}%)`);
  console.log(`Verified Flow Correct:    ${verifiedCorrect}/${verifiedCases} (${verifiedAccuracy.toFixed(1)}%) [Target >= 90%]`);
  console.log(`Unverified Flow Correct:  ${unverifiedCorrect}/${unverifiedCases} (${unverifiedAccuracy.toFixed(1)}%)`);
  console.log(`Failures Count:           ${failures.length}\n`);

  if (failures.length > 0) {
    console.log('--- FAILED CASES ---');
    for (const f of failures) {
      console.log(`[Case #${f.id}] Expected "${f.expected}" | Got "${f.got}" (${f.confidence}%)`);
      console.log(`  Snippet: "${f.inputSnippet}"`);
    }
    console.log('--------------------\n');
  } else {
    console.log('✓ All 40 test cases routed with 100% precision!\n');
  }

  return {
    totalCases,
    totalCorrect,
    overallAccuracy,
    verifiedCases,
    verifiedCorrect,
    verifiedAccuracy,
    unverifiedAccuracy,
    failures
  };
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('test-routing.js')) {
  const report = runRoutingBenchmark();
  if (report.verifiedAccuracy < 90) {
    process.exit(1);
  }
}
