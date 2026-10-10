import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { evaluatePreflight } from '../src/engine/preflight.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runPreflightBenchmark() {
  const casesPath = path.resolve(__dirname, '../data/preflight_cases.json');
  const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

  console.log('===============================================================');
  console.log(`HAQ SAATHI: PRE-FLIGHT DETERMINISTIC RULES BENCHMARK (${cases.length} CASES)`);
  console.log('===============================================================\n');

  let totalCases = cases.length;
  let correctDecisions = 0;

  let totalDefective = 0;
  let flaggedDefective = 0;

  let totalValid = 0;
  let correctValid = 0;

  const failures = [];

  for (const c of cases) {
    const result = evaluatePreflight(c.category, c.params);
    const statusMatches = result.status === c.expectedStatus;
    const defectiveMatches = result.isDefective === c.expectedDefective;
    const passed = statusMatches && defectiveMatches;

    if (c.expectedDefective) {
      totalDefective++;
      if (result.isDefective) flaggedDefective++;
    } else {
      totalValid++;
      if (!result.isDefective) correctValid++;
    }

    if (passed) {
      correctDecisions++;
    } else {
      failures.push({
        id: c.id,
        name: c.name,
        expectedStatus: c.expectedStatus,
        gotStatus: result.status,
        expectedDefective: c.expectedDefective,
        gotDefective: result.isDefective
      });
    }
  }

  const overallAccuracy = (correctDecisions / totalCases) * 100;
  const defectiveCatchRate = totalDefective > 0 ? (flaggedDefective / totalDefective) * 100 : 0;
  const validPassRate = totalValid > 0 ? (correctValid / totalValid) * 100 : 0;

  console.log(`Total Cases Evaluated:           ${totalCases}`);
  console.log(`Overall Pre-flight Accuracy:     ${correctDecisions}/${totalCases} (${overallAccuracy.toFixed(1)}%)`);
  console.log(`Defective Complaints Flagged:    ${flaggedDefective}/${totalDefective} (${defectiveCatchRate.toFixed(1)}%) [Target: 100%]`);
  console.log(`Valid Complaints Cleared:        ${correctValid}/${totalValid} (${validPassRate.toFixed(1)}%)`);
  console.log(`False Positives / Failures:      ${failures.length}\n`);

  if (failures.length > 0) {
    console.log('--- PRE-FLIGHT FAILURES ---');
    for (const f of failures) {
      console.log(`[${f.id}] ${f.name}`);
      console.log(`  Expected: Status ${f.expectedStatus}, Defective ${f.expectedDefective}`);
      console.log(`  Got:      Status ${f.gotStatus}, Defective ${f.gotDefective}`);
    }
    console.log('---------------------------\n');
  } else {
    console.log('✓ 100% of defective complaints correctly caught before filing!\n');
  }

  return {
    totalCases,
    overallAccuracy,
    totalDefective,
    flaggedDefective,
    defectiveCatchRate,
    totalValid,
    correctValid,
    validPassRate,
    failures
  };
}

if (process.argv[1] && process.argv[1].endsWith('test-preflight.js')) {
  const report = runPreflightBenchmark();
  if (report.defectiveCatchRate < 100) {
    process.exit(1);
  }
}
