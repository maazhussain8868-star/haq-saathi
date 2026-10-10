/**
 * Hero Module 3: MSME Delayed Payment & Interest Calculator
 * MSMED Act 2006 (Sections 15, 16, 17, 18) & Section 43B(h) Income Tax Act
 * Deterministic rules engine without LLM.
 */

// Current RBI Bank Rate (verified from RBI official policy rates)
export const CURRENT_RBI_BANK_RATE = 6.75; // 6.75% p.a.

export const MSME_STATUS = {
  OVERDUE: 'OVERDUE',
  WITHIN_CREDIT_PERIOD: 'WITHIN_CREDIT_PERIOD',
  MEDIUM_EXCLUDED: 'MEDIUM_EXCLUDED',
  NOT_REGISTERED: 'NOT_REGISTERED',
  PAID: 'PAID'
};

/**
 * Evaluates MSME invoice recovery, statutory due dates, and compound interest
 * @param {object} params
 * @param {boolean} params.isUdyamRegistered - Registered under Udyam Portal
 * @param {'micro'|'small'|'medium'} [params.enterpriseType] - Category of enterprise
 * @param {Date|string} params.invoiceDate - Date of invoice or acceptance of goods/services
 * @param {number|null} [params.writtenAgreementDays] - Agreed credit period in days (null if no contract)
 * @param {number} params.principalAmount - Unpaid invoice amount in INR
 * @param {boolean} [params.paymentReceived] - Whether payment has been received
 * @param {number} [params.bankRate] - Current RBI Bank Rate percentage
 * @param {Date|string} [params.currentDate] - Reference date
 * @returns {object} { status, isCovered, dueDate, daysOverdue, statutoryLimitDays, bankRate, interestRate, indicativeInterest, totalClaimable, taxNotice, steps }
 */
export function evaluateMsmeInvoice({
  isUdyamRegistered = true,
  enterpriseType = 'micro',
  invoiceDate,
  writtenAgreementDays = null,
  principalAmount = 0,
  paymentReceived = false,
  bankRate = CURRENT_RBI_BANK_RATE,
  currentDate = new Date()
} = {}) {
  const steps = [
    { step: 1, action: 'Statutory Demand Notice', detail: 'Issue formal 15-day notice citing Sections 15 & 16 MSMED Act and Section 43B(h) Income Tax Act.' },
    { step: 2, action: 'File Reference on MSME ODR Portal', detail: 'Lodge delayed payment reference with Udyam certificate and invoice copy on champions.gov.in / MSME ODR.' },
    { step: 3, action: 'MSEFC Conciliation & Arbitration', detail: 'Council initiates mandatory conciliation; on failure, enters arbitration under Arbitration & Conciliation Act 1996.' }
  ];

  const taxNotice = 'Section 43B(h) Income Tax Act: Any sum payable to a micro or small enterprise beyond the time limit specified in Section 15 of the MSMED Act is disallowed as a tax deduction for the buyer in that financial year until actually paid.';

  // Check 1: Paid
  if (paymentReceived) {
    return {
      status: MSME_STATUS.PAID,
      isCovered: true,
      daysOverdue: 0,
      indicativeInterest: 0,
      totalClaimable: 0,
      message: 'Invoice has already been marked as paid.',
      steps: []
    };
  }

  // Check 2: Udyam registration prerequisite
  if (!isUdyamRegistered) {
    return {
      status: MSME_STATUS.NOT_REGISTERED,
      isCovered: false,
      daysOverdue: 0,
      indicativeInterest: 0,
      totalClaimable: principalAmount,
      message: 'Supplier must hold valid Udyam Registration on or before the date of invoice to invoke Chapter V of MSMED Act.',
      fix: 'Obtain Udyam Registration (free on udyamregistration.gov.in) for future transactions. For current invoice, pursue civil recovery suit or NCH/arbitration.',
      steps: []
    };
  }

  // Check 3: Medium enterprises are excluded from Chapter V delayed payment benefits
  if (enterpriseType === 'medium') {
    return {
      status: MSME_STATUS.MEDIUM_EXCLUDED,
      isCovered: false,
      daysOverdue: 0,
      indicativeInterest: 0,
      totalClaimable: principalAmount,
      message: 'Under Section 2(n) and Section 15 of the MSMED Act, the statutory delayed payment recovery mechanism applies strictly to Micro and Small enterprises. Medium enterprises are excluded.',
      fix: 'Medium enterprises must pursue remedies under general contract law, commercial courts, or the Insolvency and Bankruptcy Code (IBC).',
      steps: []
    };
  }

  // Check 4: Statutory Due Date Calculation
  // Section 15: If no written agreement -> 15 days from day of acceptance.
  // If written agreement exists -> agreed period, but CANNOT exceed 45 days.
  let statutoryLimitDays = 15;
  if (typeof writtenAgreementDays === 'number' && writtenAgreementDays > 0) {
    statutoryLimitDays = Math.min(45, writtenAgreementDays);
  }

  const invDate = new Date(invoiceDate);
  const curDate = new Date(currentDate);

  if (isNaN(invDate.getTime())) {
    return {
      status: MSME_STATUS.OVERDUE,
      isCovered: true,
      statutoryLimitDays,
      message: 'Valid invoice date required to calculate exact overdue duration.',
      steps
    };
  }

  // Calculate due date
  const dueDate = new Date(invDate);
  dueDate.setDate(dueDate.getDate() + statutoryLimitDays);

  const diffMs = curDate.getTime() - dueDate.getTime();
  const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const interestRate = 3 * bankRate; // 3x RBI Bank Rate (e.g., 3 x 6.75% = 20.25% p.a.)

  // Calculate compound interest with monthly rests under Section 16:
  // A = P * (1 + r / 12)^n - P
  let indicativeInterest = 0;
  if (daysOverdue > 0 && principalAmount > 0) {
    const monthlyRate = (interestRate / 100) / 12;
    const monthsOverdue = daysOverdue / 30.416; // approximate month
    const totalAmountWithInterest = principalAmount * Math.pow(1 + monthlyRate, monthsOverdue);
    indicativeInterest = Math.round(totalAmountWithInterest - principalAmount);
  }

  const isOverdue = daysOverdue > 0;
  const status = isOverdue ? MSME_STATUS.OVERDUE : MSME_STATUS.WITHIN_CREDIT_PERIOD;

  return {
    status,
    isCovered: true,
    enterpriseType,
    statutoryLimitDays,
    dueDate: dueDate.toISOString().split('T')[0],
    daysOverdue,
    principalAmount,
    bankRate,
    interestRate,
    indicativeInterest,
    totalClaimable: principalAmount + indicativeInterest,
    interestDisclaimer: 'Indicative estimate calculated with monthly rests at 3x RBI bank rate. Final statutory award is determined by the MSEFC Council.',
    taxNotice,
    message: isOverdue
      ? `Invoice is ${daysOverdue} days overdue past the statutory limit of ${statutoryLimitDays} days. Compound interest of ~₹${indicativeInterest.toLocaleString('en-IN')} has accrued.`
      : `Invoice is within the agreed/statutory period of ${statutoryLimitDays} days (Due on ${dueDate.toISOString().split('T')[0]}).`,
    steps
  };
}
