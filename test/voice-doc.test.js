import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSpeechRecognitionLang,
  SPEECH_LANG_MAP,
  processDocumentText,
  DEMO_DOCUMENTS
} from '../src/engine/voiceDoc.js';

test('Voice AI: maps all 6 Indian languages to proper BCP-47 speech recognition codes', () => {
  assert.equal(getSpeechRecognitionLang('en'), 'en-IN');
  assert.equal(getSpeechRecognitionLang('hi'), 'hi-IN');
  assert.equal(getSpeechRecognitionLang('te'), 'te-IN');
  assert.equal(getSpeechRecognitionLang('ur'), 'ur-IN');
  assert.equal(getSpeechRecognitionLang('mr'), 'mr-IN');
  assert.equal(getSpeechRecognitionLang('ta'), 'ta-IN');
  assert.equal(getSpeechRecognitionLang('unknown'), 'hi-IN'); // Default fallback
});

test('Document Upload: pipeline sanitizes PII from uploaded documents before triage', () => {
  const sampleDoc = `
    GOVERNMENT COMPLAINT INTIMATION
    Aadhaar: 4321 8765 9812
    PAN: ABCDE1234F
    Phone: 9876543210
    Bank Account: 3098765432198765
    Description: Unauthorized online transaction of Rs 25,000 without OTP.
  `;

  const processed = processDocumentText({
    fileName: 'grievance_proof.txt',
    rawText: sampleDoc
  });

  assert.equal(processed.fileName, 'grievance_proof.txt');
  assert.equal(processed.isSanitized, true);
  assert.ok(processed.redactionReport.redactedItems.aadhaar > 0);
  assert.ok(processed.redactionReport.redactedItems.pan > 0);
  assert.ok(processed.redactionReport.redactedItems.phone > 0);

  // Redacted text must not contain raw identifiers
  assert.equal(processed.sanitizedText.includes('4321 8765 9812'), false);
  assert.equal(processed.sanitizedText.includes('ABCDE1234F'), false);
  assert.equal(processed.sanitizedText.includes('9876543210'), false);
  assert.ok(processed.sanitizedText.includes('[AADHAAR REDACTED]'));
  assert.ok(processed.sanitizedText.includes('[PAN REDACTED]'));
});

test('Document Upload: throws informative error for empty or blank document content', () => {
  assert.throws(() => {
    processDocumentText({ fileName: 'empty.txt', rawText: '   ' });
  }, /contains no extractable text/);
});

test('Demo Documents: pre-loaded sample documents are available and successfully processed', () => {
  assert.equal(DEMO_DOCUMENTS.length, 3);

  const kccDoc = DEMO_DOCUMENTS.find(d => d.id === 'kcc_receipt');
  assert.ok(kccDoc);
  const kccResult = processDocumentText({ fileName: 'kcc.txt', rawText: kccDoc.rawText });
  assert.ok(kccResult.sanitizedText.includes('PMFBY'));
  assert.ok(kccResult.sanitizedText.includes('[AADHAAR REDACTED]'));

  const bankDoc = DEMO_DOCUMENTS.find(d => d.id === 'bank_sms_notice');
  assert.ok(bankDoc);
  const bankResult = processDocumentText({ fileName: 'bank.txt', rawText: bankDoc.rawText });
  assert.ok(bankResult.sanitizedText.includes('Clause 10'));
  assert.ok(bankResult.sanitizedText.includes('[PAN REDACTED]'));

  const msmeDoc = DEMO_DOCUMENTS.find(d => d.id === 'msme_tax_invoice');
  assert.ok(msmeDoc);
  const msmeResult = processDocumentText({ fileName: 'msme.txt', rawText: msmeDoc.rawText });
  assert.ok(msmeResult.sanitizedText.includes('MSMED Act'));
});
