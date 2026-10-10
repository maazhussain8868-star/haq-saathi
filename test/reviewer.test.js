import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createReviewRequest,
  getReviewRequest,
  submitClaimReview,
  validateRule36Compliance,
  REVIEW_STATUS,
  CLAIM_VERIFICATION,
  OFFICIAL_HANDOFFS
} from '../src/engine/reviewer.js';

test('Reviewer: requires explicit user consent before generating review request', () => {
  assert.throws(() => {
    createReviewRequest({
      userConsent: false,
      draftEn: 'Sample draft without consent',
      claims: ['Claim 1']
    });
  }, /User consent required/);
});

test('Reviewer: enforces Bar Council of India Rule 36 compliance', () => {
  // Valid payload with no commercial lawyer directory
  const valid = { category: 'bank_ombudsman', status: 'PENDING_REVIEW' };
  assert.equal(validateRule36Compliance(valid), true);

  // Illegal marketplace fields must trigger hard error
  assert.throws(() => {
    validateRule36Compliance({ lawyer_name: 'Advocate Verma', lawyer_rating: 4.8 });
  }, /BCI Rule 36 Violation/);

  assert.throws(() => {
    validateRule36Compliance({ hourly_fee: 2500 });
  }, /BCI Rule 36 Violation/);
});

test('Reviewer: round-trip token creation and parsing', () => {
  const req = createReviewRequest({
    userConsent: true,
    category: 'Bank Ombudsman Grievance',
    categoryId: 'bank_ombudsman',
    draftUser: 'अनधिकृत निकासी की शिकायत',
    draftEn: 'Formal complaint regarding unauthorized debit of Rs 45,000.',
    claims: [
      'Dispute occurred on 2026-10-01',
      'Bank failed to respond within statutory 30 days',
      'Customer reported immediately within 72 hours'
    ]
  });

  assert.ok(req.reviewId.startsWith('rev_'));
  assert.ok(req.token.length > 20);
  assert.equal(req.payload.isSimulated, true);
  assert.equal(req.payload.simulatedLabel, 'SIMULATED (demo)');

  // Decode
  const parsed = getReviewRequest(req.token);
  assert.equal(parsed.categoryId, 'bank_ombudsman');
  assert.equal(parsed.claims.length, 3);
  assert.equal(parsed.claims[0].text, 'Dispute occurred on 2026-10-01');
});

test('Reviewer: evaluates 100% verified claims and calculates factual grounding score', () => {
  const req = createReviewRequest({
    userConsent: true,
    claims: ['Claim 1', 'Claim 2', 'Claim 3']
  });

  const reviewed = submitClaimReview({
    existingPayload: req.payload,
    claimAudits: {
      c_1: { status: CLAIM_VERIFICATION.VERIFIED, comment: 'Matches SMS timestamp' },
      c_2: { status: CLAIM_VERIFICATION.VERIFIED, comment: 'Passbook transaction verified' },
      c_3: { status: CLAIM_VERIFICATION.VERIFIED, comment: 'Statutory deadline met' }
    },
    overallNote: 'All factual statements grounded.'
  });

  assert.equal(reviewed.status, REVIEW_STATUS.REVIEWED);
  assert.equal(reviewed.groundingScore, 100);
  assert.equal(reviewed.verifiedCount, 3);
  assert.equal(reviewed.auditVerdict, 'GROUNDED');
  assert.ok(reviewed.reviewerBadge.includes('SIMULATED (demo)'));
});

test('Reviewer: flags defects and missing evidence with proper score reduction', () => {
  const req = createReviewRequest({
    userConsent: true,
    claims: ['Claim A', 'Claim B', 'Claim C', 'Claim D']
  });

  const reviewed = submitClaimReview({
    existingPayload: req.payload,
    claimAudits: {
      c_1: { status: CLAIM_VERIFICATION.VERIFIED },
      c_2: { status: CLAIM_VERIFICATION.COMMENT, comment: 'Attach bank refusal letter' },
      c_3: { status: CLAIM_VERIFICATION.DEFECTIVE, comment: 'Statutory 30 days not yet completed' },
      c_4: { status: CLAIM_VERIFICATION.VERIFIED }
    }
  });

  assert.equal(reviewed.groundingScore, 50); // 2 out of 4 verified
  assert.equal(reviewed.verifiedCount, 2);
  assert.equal(reviewed.auditVerdict, 'DEFECTS_FOUND');
  assert.equal(reviewed.auditedClaims[2].status, CLAIM_VERIFICATION.DEFECTIVE);
});

test('Reviewer: provides official government handoffs (Tele-Law and NALSA 15100)', () => {
  assert.ok(OFFICIAL_HANDOFFS.TELE_LAW.url.includes('tele-law.in'));
  assert.ok(OFFICIAL_HANDOFFS.NALSA.phone.includes('15100'));
  assert.ok(OFFICIAL_HANDOFFS.NALSA.url.includes('nalsa.gov.in'));
});
