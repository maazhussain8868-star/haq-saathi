/**
 * Phase 4: Volunteer Reviewer Mode (Safe Human-In-The-Loop Architecture)
 * Compliant with Bar Council of India Rule 36:
 * - NO lawyer directory, marketplace, profiles, advertising, fees, or star ratings.
 * - Human-in-the-loop audit is volunteer / paralegal simulated demo.
 * - Handoff exclusively to official government services: Tele-Law (tele-law.in) & NALSA (15100).
 * - PII-sanitized claims verification.
 */

export const REVIEW_STATUS = {
  PENDING: 'PENDING_REVIEW',
  REVIEWED: 'REVIEWED'
};

export const CLAIM_VERIFICATION = {
  VERIFIED: 'VERIFIED',       // Claim grounded in factual evidence & timeline
  COMMENT: 'NEEDS_EVIDENCE',  // Claim requires clarification or document proof
  DEFECTIVE: 'DEFECTIVE'      // Claim conflicts with statute or unsupported
};

export const OFFICIAL_HANDOFFS = {
  TELE_LAW: {
    name: 'Tele-Law Portal (Ministry of Law & Justice)',
    url: 'https://www.tele-law.in/',
    phone: 'Via nearest CSC / Tele-Law App',
    feeNote: 'Free for s.12 LSA eligible citizens; Rs. 30 consultation for others'
  },
  NALSA: {
    name: 'National Legal Services Authority (NALSA / DLSA)',
    url: 'https://nalsa.gov.in/',
    phone: '15100 (Toll-Free Legal Aid Helpline)',
    feeNote: '100% Free Government Legal Aid under Legal Services Authorities Act'
  }
};

/**
 * Validates Bar Council of India Rule 36 compliance:
 * Prohibits lawyer solicitation, profiles, marketplace, prices, or fee commissions.
 */
export function validateRule36Compliance(payload) {
  const forbiddenKeys = ['lawyer_name', 'lawyer_rate', 'hourly_fee', 'lawyer_rating', 'hire_now', 'commission'];
  for (const key of forbiddenKeys) {
    if (payload && payload[key] !== undefined) {
      throw new Error(`BCI Rule 36 Violation: Forbidden commercial lawyer marketplace property "${key}" detected.`);
    }
  }
  return true;
}

/**
 * Encodes review payload to URL-safe Base64
 */
function encodePayload(obj) {
  try {
    const jsonStr = JSON.stringify(obj);
    if (typeof btoa !== 'undefined') {
      return btoa(unescape(encodeURIComponent(jsonStr)));
    } else if (typeof Buffer !== 'undefined') {
      return Buffer.from(jsonStr, 'utf8').toString('base64url');
    }
    return jsonStr;
  } catch (err) {
    return null;
  }
}

/**
 * Decodes URL-safe Base64 payload
 */
function decodePayload(encoded) {
  try {
    if (typeof atob !== 'undefined') {
      return JSON.parse(decodeURIComponent(escape(atob(encoded))));
    } else if (typeof Buffer !== 'undefined') {
      return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    }
    return JSON.parse(encoded);
  } catch (err) {
    return null;
  }
}

/**
 * Creates a PII-sanitized human review payload with user consent
 * @param {object} params
 * @param {boolean} params.userConsent - Mandatory explicit consent
 * @param {string} params.draftUser - Redacted user language draft
 * @param {string} params.draftEn - Redacted English draft
 * @param {string[]} params.claims - List of 3-6 verifiable claims
 * @param {string} params.category - Grievance category
 * @returns {object} Review creation result with reviewId, shareableToken, and shareableUrl
 */
export function createReviewRequest({
  userConsent = false,
  draftUser = '',
  draftEn = '',
  claims = [],
  category = 'General Grievance',
  categoryId = 'general'
} = {}) {
  if (!userConsent) {
    throw new Error('User consent required: Citizen must explicitly authorize PII-sanitized volunteer review.');
  }

  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  const payload = {
    reviewId,
    timestamp,
    categoryId,
    category,
    draftUser,
    draftEn,
    claims: claims.map((c, i) => ({ id: `c_${i + 1}`, text: c })),
    status: REVIEW_STATUS.PENDING,
    isSimulated: true,
    simulatedLabel: 'SIMULATED (demo)'
  };

  validateRule36Compliance(payload);

  const token = encodePayload(payload);

  // Store locally for cross-tab or offline access
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`haq_saathi_${reviewId}`, JSON.stringify(payload));
    } catch (e) {
      // Ignore quota errors
    }
  }

  return {
    reviewId,
    token,
    payload,
    shareUrl: typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?review=${token}` : `?review=${token}`
  };
}

/**
 * Retrieves and parses review request from token or reviewId
 */
export function getReviewRequest(tokenOrId) {
  if (!tokenOrId) return null;

  // Try decoding as base64 token first
  let data = decodePayload(tokenOrId);

  // Fallback to localStorage by ID
  if (!data && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(`haq_saathi_${tokenOrId}`);
      if (stored) data = JSON.parse(stored);
    } catch (e) {
      // Ignore
    }
  }

  if (data) {
    validateRule36Compliance(data);
  }

  return data;
}

/**
 * Evaluates claims audit and submits volunteer review (simulated in demo)
 * @param {object} params
 * @param {string} params.reviewId
 * @param {object} params.claimAudits - Map of claimId -> { status: 'VERIFIED'|'NEEDS_EVIDENCE'|'DEFECTIVE', comment: string }
 * @param {string} [params.overallNote] - Reviewer commentary
 * @param {string} [params.reviewerBadge]
 * @returns {object} Evaluated review summary
 */
export function submitClaimReview({
  reviewId = '',
  existingPayload = null,
  claimAudits = {},
  overallNote = 'Verified against statutory requirements. Ready for filing with competent authority.',
  reviewerBadge = 'SIMULATED (demo) - Volunteer Paralegal'
} = {}) {
  const payload = existingPayload || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(`haq_saathi_${reviewId}`) || 'null') : null);

  const totalClaims = payload?.claims?.length || Object.keys(claimAudits).length || 1;
  let verifiedCount = 0;
  let commentCount = 0;
  let defectiveCount = 0;

  const auditedClaims = (payload?.claims || []).map(claim => {
    const audit = claimAudits[claim.id] || { status: CLAIM_VERIFICATION.VERIFIED, comment: '' };
    if (audit.status === CLAIM_VERIFICATION.VERIFIED) verifiedCount++;
    else if (audit.status === CLAIM_VERIFICATION.COMMENT) commentCount++;
    else if (audit.status === CLAIM_VERIFICATION.DEFECTIVE) defectiveCount++;

    return {
      id: claim.id,
      text: claim.text,
      status: audit.status,
      comment: audit.comment || ''
    };
  });

  const groundingScore = Math.round((verifiedCount / totalClaims) * 100);

  let auditVerdict = 'GROUNDED';
  if (defectiveCount > 0) auditVerdict = 'DEFECTS_FOUND';
  else if (commentCount > 0) auditVerdict = 'CLARIFICATIONS_NEEDED';

  const reviewedData = {
    ...payload,
    reviewId: payload?.reviewId || reviewId,
    status: REVIEW_STATUS.REVIEWED,
    reviewedAt: new Date().toISOString(),
    reviewerBadge,
    isSimulated: true,
    groundingScore,
    verifiedCount,
    totalClaims,
    auditVerdict,
    auditedClaims,
    overallNote,
    handoffs: OFFICIAL_HANDOFFS
  };

  validateRule36Compliance(reviewedData);

  // Update storage
  if (typeof localStorage !== 'undefined' && reviewedData.reviewId) {
    try {
      localStorage.setItem(`haq_saathi_${reviewedData.reviewId}`, JSON.stringify(reviewedData));
    } catch (e) {
      // Ignore
    }
  }

  return reviewedData;
}
