import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMPACT_METRICS,
  getCitizenImpactCounter,
  incrementCitizenImpactCounter,
  CACHED_DEMO_RESPONSES
} from '../src/engine/telemetry.js';

test('Telemetry: impact metrics adhere to verified benchmark data', () => {
  assert.equal(IMPACT_METRICS.regulatorsCovered, 6);
  assert.equal(IMPACT_METRICS.verifiedRoutingAccuracy, 100);
  assert.equal(IMPACT_METRICS.preflightDefectCatchRate, 100);
  assert.equal(IMPACT_METRICS.multilingualParityRate, 100);
  assert.equal(IMPACT_METRICS.benchmarkCasesEvaluated, 40);
});

test('Telemetry: citizen impact counter increments reliably', () => {
  const initial = getCitizenImpactCounter();
  assert.equal(typeof initial, 'number');
  assert.ok(initial >= 100);

  const incremented = incrementCitizenImpactCounter();
  assert.equal(incremented, initial + 1);
});

test('Cached Demo Mode: offline fallbacks available for all 4 hero personas', () => {
  assert.ok(CACHED_DEMO_RESPONSES.farmer);
  assert.ok(CACHED_DEMO_RESPONSES.bank);
  assert.ok(CACHED_DEMO_RESPONSES.msme);
  assert.ok(CACHED_DEMO_RESPONSES.woman);

  // Verify farmer offline response
  assert.equal(CACHED_DEMO_RESPONSES.farmer.status, 'READY');
  assert.ok(CACHED_DEMO_RESPONSES.farmer.claims.length >= 3);

  // Verify bank offline response
  assert.equal(CACHED_DEMO_RESPONSES.bank.status, 'READY');
  assert.ok(CACHED_DEMO_RESPONSES.bank.claims.length >= 3);

  // Verify MSME offline response
  assert.equal(CACHED_DEMO_RESPONSES.msme.status, 'OVERDUE');

  // Verify legal aid woman offline response
  assert.equal(CACHED_DEMO_RESPONSES.woman.status, 'ELIGIBLE');
});
