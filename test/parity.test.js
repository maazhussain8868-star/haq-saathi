import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runParityBenchmark } from '../scripts/test-parity.js';
import { detectLanguage, renderStatusCode, t, LANGUAGE_OPTIONS } from '../src/i18n/index.js';

describe('Phase 2D: Multilingual Layer & Parity Benchmarks', () => {
  it('detects scripts accurately for English, Hindi, Telugu, Urdu, Marathi, and Tamil', () => {
    assert.equal(detectLanguage('My crop was damaged by hailstorm'), 'en');
    assert.equal(detectLanguage('मेरी फसल ओलावृष्टि से खराब हो गई'), 'hi');
    assert.equal(detectLanguage('నా పత్తి పంట భారీ వర్షానికి దెब्బతింది'), 'te');
    assert.equal(detectLanguage('میری فصل ژالہ باری سے تباہ ہو گئی'), 'ur');
    assert.equal(detectLanguage('गारपिटीमुळे पिकाचे मोठे नुकसान झाले आहे'), 'mr');
    assert.equal(detectLanguage('ஆலங்கட்டி மழையால் பயிர் சேதமடைந்தது'), 'ta');
  });

  it('renders structured engine codes into localized strings across Tier 1 & 2', () => {
    assert.ok(renderStatusCode('READY', 'en').includes('READY'));
    assert.ok(renderStatusCode('READY', 'hi').includes('तैयार'));
    assert.ok(renderStatusCode('READY', 'te').includes('సిద్ధంగా'));
    assert.ok(renderStatusCode('READY', 'ur').includes('تیار'));
  });

  it('provides all 6 languages with proper direction and Tier 2 BETA badge', () => {
    assert.equal(LANGUAGE_OPTIONS.length, 6);
    const urdu = LANGUAGE_OPTIONS.find(l => l.code === 'ur');
    assert.equal(urdu.dir, 'rtl');
    assert.equal(urdu.badge, 'BETA');

    const marathi = LANGUAGE_OPTIONS.find(l => l.code === 'mr');
    assert.equal(marathi.badge, 'BETA');

    const telugu = LANGUAGE_OPTIONS.find(l => l.code === 'te');
    assert.equal(telugu.tier, 1);
    assert.equal(telugu.badge, '');
  });

  it('achieves 100% engine correctness parity and >=90% routing across all 6 languages', () => {
    const report = runParityBenchmark();
    for (const [code, data] of Object.entries(report)) {
      assert.equal(data.engineAccuracy, 100, `Engine correctness for ${code} must be 100% identical`);
      assert.ok(data.routingAccuracy >= 90, `Routing accuracy for ${code} was ${data.routingAccuracy}%, expected >=90%`);
    }
  });
});
