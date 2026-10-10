/**
 * Hero Module 2: Free Legal Aid Eligibility Checker
 * Section 12 of the Legal Services Authorities Act, 1987
 * Evaluates statutory criteria without LLM.
 */

// State-wise annual income thresholds for general low-income category (as prescribed by respective SLSAs)
export const STATE_INCOME_LIMITS = {
  default: 300000, // Standard baseline (Rs 3,00,000 / annum)
  delhi: 300000,
  maharashtra: 300000,
  telangana: 300000,
  karnataka: 300000,
  uttar_pradesh: 300000,
  bihar: 150000,
  tamil_nadu: 300000,
  west_bengal: 150000
};

/**
 * Evaluates Free Legal Aid Eligibility under Section 12 LSA Act
 * @param {object} params
 * @param {boolean} [params.woman] - Woman applicant
 * @param {boolean} [params.child] - Child applicant (under 18)
 * @param {boolean} [params.sc_st] - Member of Scheduled Caste or Scheduled Tribe
 * @param {boolean} [params.disability] - Person with disability (RPwD Act)
 * @param {boolean} [params.victim] - Victim of trafficking, beggar, ethnic violence, or disaster
 * @param {boolean} [params.industrial_workman] - Industrial workman
 * @param {boolean} [params.in_custody] - Person in custody / juvenile home
 * @param {number} [params.annual_income] - Annual household income in INR
 * @param {string} [params.state] - State of residence
 * @returns {object} { eligible, eligibleCategories, requiresIncomeTest, incomeLimitNotice, statute, handoffs }
 */
export function evaluateLegalAid({
  woman = false,
  child = false,
  sc_st = false,
  disability = false,
  victim = false,
  industrial_workman = false,
  in_custody = false,
  annual_income = 0,
  state = 'All India'
} = {}) {
  const eligibleCategories = [];

  // Check the 7 Non-Income Protected Categories under Section 12
  if (woman) eligibleCategories.push('Woman (Section 12(c)) - No income cap');
  if (child) eligibleCategories.push('Child under 18 (Section 12(c)) - No income cap');
  if (sc_st) eligibleCategories.push('Scheduled Caste / Scheduled Tribe (Section 12(a)) - No income cap');
  if (disability) eligibleCategories.push('Person with Disability (Section 12(d)) - No income cap');
  if (victim) eligibleCategories.push('Victim of Disaster / Trafficking / Violence (Section 12(e)) - No income cap');
  if (industrial_workman) eligibleCategories.push('Industrial Workman (Section 12(f)) - No income cap');
  if (in_custody) eligibleCategories.push('Person in Custody / Detention (Section 12(g)) - No income cap');

  const handoffs = [
    { name: 'NALSA 24/7 National Toll-Free Helpline', contact: '15100', type: 'phone', fee: 'Free' },
    { name: 'Tele-Law Video/Phone Consultation', contact: 'tele-law.in / Nearest CSC', type: 'portal', fee: 'Free for s.12 eligible' },
    { name: 'District Legal Services Authority (DLSA)', contact: 'District Court Complex Front Desk', type: 'office', fee: 'Free Counsel Assigned' }
  ];

  // If applicant satisfies any of the first 7 categories: 100% ELIGIBLE regardless of income!
  if (eligibleCategories.length > 0) {
    return {
      eligible: true,
      eligibleCategories,
      requiresIncomeTest: false,
      incomeCapApplied: null,
      incomeLimitNotice: 'Eligible under special statutory category: First 7 categories have NO income test under Section 12.',
      statute: 'Section 12, Legal Services Authorities Act, 1987',
      remedy: 'Entitled to free legal aid, counsel representation, court fee waiver, and preparation of appeals.',
      handoffs
    };
  }

  // General Category: requires income test based on state SLSA rules
  const normalizedState = (state || '').toLowerCase().replace(/[^a-z]/g, '');
  const stateLimit = STATE_INCOME_LIMITS[normalizedState] || STATE_INCOME_LIMITS.default;

  const meetsIncome = annual_income <= stateLimit;

  if (meetsIncome) {
    eligibleCategories.push(`Low-Income Citizen (Annual Income ₹${Number(annual_income).toLocaleString('en-IN')} ≤ State Limit ₹${Number(stateLimit).toLocaleString('en-IN')})`);
    return {
      eligible: true,
      eligibleCategories,
      requiresIncomeTest: true,
      incomeCapApplied: stateLimit,
      incomeLimitNotice: `Verify state limit on SLSA portal. Prescribed state ceiling applied: ₹${Number(stateLimit).toLocaleString('en-IN')} per annum.`,
      statute: 'Section 12(h), Legal Services Authorities Act, 1987',
      remedy: 'Eligible for panel lawyer assignment and court litigation support through DLSA.',
      handoffs
    };
  }

  // Over income limit and not in protected categories
  return {
    eligible: false,
    eligibleCategories: [],
    requiresIncomeTest: true,
    incomeCapApplied: stateLimit,
    incomeLimitNotice: `Annual income (₹${Number(annual_income).toLocaleString('en-IN')}) exceeds state threshold (₹${Number(stateLimit).toLocaleString('en-IN')}). Verify state limit if filing in High Court/Supreme Court where higher caps apply.`,
    statute: 'Section 12, Legal Services Authorities Act, 1987',
    remedy: 'Not eligible for free litigation counsel. However, you can consult a Tele-Law panel advocate for ₹30 consultation fee.',
    handoffs: [
      { name: 'Tele-Law Consultation (Standard Rate)', contact: 'tele-law.in / CSC', type: 'portal', fee: '₹30 per consultation' },
      { name: 'NALSA Legal Aid Helpline (Information)', contact: '15100', type: 'phone', fee: 'Free Toll-Free' }
    ]
  };
}
