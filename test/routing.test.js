import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runRoutingBenchmark } from '../scripts/test-routing.js';
import { loadKb } from '../src/engine/router.js';

describe('Knowledge Base & Routing Engine (Phase 1 Benchmark)', () => {
  it('loads valid KB schema for all entries', () => {
    const kb = loadKb();
    assert.ok(Array.isArray(kb));
    assert.ok(kb.length >= 10);

    for (const entry of kb) {
      assert.ok(entry.id, 'Entry must have an id');
      assert.ok(entry.category, 'Entry must have a category name');
      assert.ok(entry.trigger, 'Entry must have triggers');
      assert.ok(Array.isArray(entry.steps), 'Entry must have steps array');
      assert.ok(typeof entry.verified === 'boolean', 'verified must be boolean');
      assert.ok(Array.isArray(entry.source_urls), 'source_urls must be array');
      assert.ok(entry.last_verified, 'last_verified must exist');

      for (const step of entry.steps) {
        assert.ok(step.text, 'Step must have text');
        assert.ok(step.forum, 'Step must have forum');
        assert.ok('wait_days' in step, 'Step must have wait_days or null');
        assert.ok(step.source, 'Step must have source citation');
      }
    }
  });

  it('meets target >= 90% routing accuracy on verified categories across 40 cases', () => {
    const report = runRoutingBenchmark();
    assert.equal(report.totalCases, 40);
    assert.ok(
      report.verifiedAccuracy >= 90,
      `Verified accuracy was ${report.verifiedAccuracy}%, expected >= 90%`
    );
    assert.ok(
      report.overallAccuracy >= 85,
      `Overall accuracy was ${report.overallAccuracy}%, expected >= 85%`
    );
  });
});
