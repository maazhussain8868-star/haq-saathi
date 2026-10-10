import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { redactPii } from '../src/engine/redact.js';
import { runTriage, generateDraft, checkSafetyRisk } from '../src/engine/triageAndDraft.js';
import { routeGrievance } from '../src/engine/router.js';

describe('Phase 2: PII Redaction Engine', () => {
  it('redacts 12-digit Aadhaar numbers', () => {
    const raw = 'My Aadhaar number is 5432 1098 7654 please verify.';
    const { redactedText, redactedItems } = redactPii(raw);
    assert.ok(redactedText.includes('[AADHAAR REDACTED]'));
    assert.ok(!redactedText.includes('5432 1098 7654'));
    assert.equal(redactedItems.aadhaar, 1);
  });

  it('redacts PAN card numbers', () => {
    const raw = 'My PAN number is ABCDE1234F linked to the account.';
    const { redactedText, redactedItems } = redactPii(raw);
    assert.ok(redactedText.includes('[PAN REDACTED]'));
    assert.ok(!redactedText.includes('ABCDE1234F'));
    assert.equal(redactedItems.pan, 1);
  });

  it('redacts 10-digit Indian phone numbers with country codes', () => {
    const raw = 'Call me on +91 9876543210 or 8765432109 immediately.';
    const { redactedText, redactedItems } = redactPii(raw);
    assert.ok(!redactedText.includes('9876543210'));
    assert.ok(!redactedText.includes('8765432109'));
    assert.equal(redactedItems.phone, 2);
  });

  it('redacts email addresses', () => {
    const raw = 'Send email updates to farmer.kisan123@gmail.com.';
    const { redactedText, redactedItems } = redactPii(raw);
    assert.ok(redactedText.includes('[EMAIL REDACTED]'));
    assert.ok(!redactedText.includes('farmer.kisan123@gmail.com'));
    assert.equal(redactedItems.email, 1);
  });

  it('redacts long bank account numbers', () => {
    const raw = 'My bank account is 9876543210987654 in SBI branch.';
    const { redactedText, redactedItems } = redactPii(raw);
    assert.ok(redactedText.includes('[ACCOUNT NUMBER REDACTED]'));
    assert.ok(!redactedText.includes('9876543210987654'));
  });
});

describe('Phase 2: Call 1 Triage & Safety System', () => {
  it('flags immediate violence/safety threats with safety=true and provides emergency helplines', () => {
    const threatText = 'The moneylender came to my house with weapon and threatened to kill me tonight!';
    const triage = runTriage(threatText);
    assert.equal(triage.safety, true);
    assert.equal(triage.cat, 'emergency_safety');
    assert.ok(triage.emergency_helplines.length >= 3);
    assert.equal(triage.questions.length, 0); // No questions or draft on active safety threat
  });

  it('routes standard farmer grievance with <= 3 targeted clarifying questions', () => {
    const input = 'Hailstorm ruined my wheat crop yesterday in Vidarbha.';
    const triage = runTriage(input);
    assert.equal(triage.safety, false);
    assert.equal(triage.cat, 'farmer_pmfby');
    assert.ok(triage.questions.length <= 3);
  });

  it('falls back to "other" category if confidence is below 60%', () => {
    const ambiguousText = 'Something happened yesterday and someone said something bad.';
    const triage = runTriage(ambiguousText);
    assert.equal(triage.cat, 'other');
  });
});

describe('Phase 2: Call 2 Drafting System', () => {
  it('generates compliant draft with user copy, English official copy, and 3-6 verifiable claims', () => {
    const text = 'Cotton crop damaged by hailstorm yesterday in Satara.';
    const triage = runTriage(text);
    const draft = generateDraft({
      redactedText: triage.redactedText,
      answers: { date: 'Yesterday afternoon (24 hrs ago)' },
      matchedKb: triage.matchedKb,
      userLanguage: 'hi'
    });

    // Check schema
    assert.ok(draft.draft_user, 'Must contain user language draft');
    assert.ok(draft.draft_en, 'Must contain official English draft');
    assert.ok(Array.isArray(draft.claims), 'Claims must be an array');
    assert.ok(draft.claims.length >= 3 && draft.claims.length <= 6, 'Claims must be between 3 and 6');
    assert.ok(draft.disclaimer.includes('Ye legal jaankari hai, vakil ki salah nahi'));
    assert.ok(draft.citations.category.length > 0);

    // Verify user copy is Hindi
    assert.ok(draft.draft_user.includes('सेवा में'));
    assert.ok(draft.draft_user.includes('प्रधानमंत्री फसल बीमा योजना'));

    // Verify English copy contains statutory guidelines
    assert.ok(draft.draft_en.includes('72-Hour Statutory Window'));
    assert.ok(draft.draft_en.includes('PMFBY'));
  });

  it('drafts bank ombudsman grievance with placeholders and citations', () => {
    const bankGrievance = 'Debited Rs 25,000 via UPI but not credited. Complained 35 days ago to bank.';
    const triage = runTriage(bankGrievance);
    const draft = generateDraft({
      redactedText: triage.redactedText,
      answers: { amount: 'Rs 25,000', date: '35 days ago' },
      matchedKb: triage.matchedKb,
      userLanguage: 'en'
    });

    assert.ok(draft.draft_en.includes('Reserve Bank of India Integrated Ombudsman'));
    assert.ok(draft.draft_en.includes('Rs 25,000'));
    assert.ok(draft.claims.length >= 3);
  });

  it('drafts MSME overdue invoice demand notice under sections 15 & 16', () => {
    const msmeGrievance = 'Small IT firm delivered software, invoice overdue by 60 days. Udyam registered.';
    const triage = runTriage(msmeGrievance);
    const draft = generateDraft({
      redactedText: triage.redactedText,
      answers: { amount: 'Rs 4.5 Lakhs', date: '60 days ago' },
      matchedKb: triage.matchedKb,
      userLanguage: 'en'
    });

    assert.ok(draft.draft_en.includes('MSMED Act, 2006'));
    assert.ok(draft.draft_en.includes('THREE TIMES the RBI Bank Rate'));
    assert.ok(draft.draft_en.includes('Section 43B(h)'));
  });
});
