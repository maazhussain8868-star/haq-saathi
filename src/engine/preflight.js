/**
 * Deterministic Pre-Flight Rules Engine for Haq Saathi
 * Validates complaints BEFORE the user files them to prevent the ~85% first-screening closure rate.
 * NO LLM inside: 100% testable, deterministic rule logic based on official statutes.
 */

export const PREFLIGHT_STATUS = {
  READY: 'READY',
  WAIT: 'WAIT',
  TIME_BARRED: 'TIME_BARRED',
  WRONG_FORUM: 'WRONG_FORUM'
};

/**
 * Banking Pre-flight Check (RBI Integrated Ombudsman Scheme 2021)
 * @param {object} params
 * @param {boolean} params.hasWrittenComplaint - Did user complain to bank in writing first?
 * @param {number} params.daysSinceComplaint - Days since written complaint was lodged
 * @param {boolean} params.isRejectedByBank - Did the bank formally reject the complaint?
 * @param {number|null} params.daysSinceReply - Days since the bank's rejection/final reply
 * @returns {object} { status, badge, reason, fix, daysToWait }
 */
export function preflightBank({
  hasWrittenComplaint = false,
  daysSinceComplaint = 0,
  isRejectedByBank = false,
  daysSinceReply = null
} = {}) {
  // Prerequisite 1: Written complaint to bank first
  if (!hasWrittenComplaint) {
    return {
      status: PREFLIGHT_STATUS.WAIT,
      badge: 'WAIT (No Prior Bank Complaint)',
      isDefective: true,
      reason: 'Under Clause 10(1)(a) of the RBI Integrated Ombudsman Scheme, you must submit a written grievance to the bank branch or nodal officer first.',
      fix: 'File a formal written complaint with your bank branch manager or Principal Nodal Officer and obtain an acknowledgement before escalating to the Ombudsman.',
      daysToWait: 30
    };
  }

  // Prerequisite 2: Limitation period check
  // (a) If bank replied: must be within 1 year (365 days) of reply
  if (isRejectedByBank && daysSinceReply !== null && daysSinceReply > 365) {
    return {
      status: PREFLIGHT_STATUS.TIME_BARRED,
      badge: 'TIME-BARRED (> 1 Year Since Reply)',
      isDefective: true,
      reason: 'Under Clause 10(2) of the Scheme, the complaint must be lodged within 1 year from the date of the bank’s final reply or rejection.',
      fix: 'This matter can no longer be accepted by the RBI Ombudsman. Your legal remedy is now the District Consumer Commission or a Civil Court.',
      daysToWait: 0
    };
  }

  // (b) If bank did not reply: must be within 1 year and 30 days (395 days) of original complaint
  if (!isRejectedByBank && daysSinceComplaint > 395) {
    return {
      status: PREFLIGHT_STATUS.TIME_BARRED,
      badge: 'TIME-BARRED (> 1 Year 30 Days)',
      isDefective: true,
      reason: 'Under Clause 10(2), if no reply was received from the bank, complaint must be filed within 1 year and 30 days of the date of representation.',
      fix: 'This grievance is time-barred for the Banking Ombudsman. You may approach the Consumer Protection Forum.',
      daysToWait: 0
    };
  }

  // Prerequisite 3: 30-day waiting period
  if (!isRejectedByBank && daysSinceComplaint < 30) {
    const daysToWait = 30 - daysSinceComplaint;
    return {
      status: PREFLIGHT_STATUS.WAIT,
      badge: `WAIT (${daysToWait} Days Remaining)`,
      isDefective: true,
      reason: `Under Clause 10(1)(a), the bank has 30 days to resolve your complaint. Only ${daysSinceComplaint} days have elapsed.`,
      fix: `Wait another ${daysToWait} days for the bank's response. If the bank rejects earlier, you can file immediately upon receiving their rejection letter.`,
      daysToWait
    };
  }

  // All prerequisites satisfied
  return {
    status: PREFLIGHT_STATUS.READY,
    badge: 'READY TO FILE (RBI Ombudsman)',
    isDefective: false,
    reason: isRejectedByBank
      ? 'Bank has formally rejected or failed to satisfactorily resolve the written complaint.'
      : 'Mandatory 30-day waiting period has elapsed without bank resolution.',
    fix: 'Proceed to file online at cms.rbi.org.in or submit via email to crpc@rbi.org.in.',
    daysToWait: 0
  };
}

/**
 * Consumer Commission Pre-flight Check (Consumer Protection Act 2019)
 * @param {object} params
 * @param {number} params.considerationPaid - Total consideration paid (in INR)
 * @param {number} params.daysSinceCauseOfAction - Days since cause of action arose
 * @returns {object} { status, badge, forum, reason, fix }
 */
export function preflightConsumer({
  considerationPaid = 0,
  daysSinceCauseOfAction = 0
} = {}) {
  // Limitation: 2 years (730 days) under Section 69 CPA 2019
  if (daysSinceCauseOfAction > 730) {
    return {
      status: PREFLIGHT_STATUS.TIME_BARRED,
      badge: 'TIME-BARRED (> 2 Years)',
      isDefective: true,
      forum: 'Consumer Commission',
      reason: 'Under Section 69 of the Consumer Protection Act 2019, the limitation period is strictly 2 years from the date on which the cause of action arose.',
      fix: 'File a separate Application for Condonation of Delay stating sufficient cause under s.69(2), or explore a civil suit.'
    };
  }

  // Pecuniary jurisdiction determined by CONSIDERATION PAID (not compensation claimed)
  let forum = 'District Consumer Disputes Redressal Commission';
  if (considerationPaid > 20000000) {
    forum = 'National Consumer Disputes Redressal Commission (NCDRC)';
  } else if (considerationPaid > 5000000) {
    forum = 'State Consumer Disputes Redressal Commission (SCDRC)';
  }

  return {
    status: PREFLIGHT_STATUS.READY,
    badge: `READY (${forum.split(' ')[0]} Commission)`,
    isDefective: false,
    forum,
    reason: `Jurisdiction assigned to ${forum} based on consideration paid of ₹${Number(considerationPaid).toLocaleString('en-IN')}.`,
    fix: 'Prepare formal petition on e-Daakhil (edaakhil.nic.in) or submit directly to the registry.'
  };
}

/**
 * Police / FIR Refusal Ladder Pre-flight Check (BNSS 2023)
 * @param {object} params
 * @param {boolean} params.approachedStation - Did user visit/approach police station first?
 * @param {boolean} params.stationRefused - Did officer-in-charge refuse to register FIR?
 * @param {boolean} params.sentToSP - Did user send written substance to SP/DCP?
 * @param {number} params.daysSinceSP - Days since SP representation was sent
 * @returns {object} { status, badge, currentStep, nextAction, fix }
 */
export function preflightPolice({
  approachedStation = false,
  stationRefused = false,
  sentToSP = false,
  daysSinceSP = 0
} = {}) {
  if (!approachedStation) {
    return {
      status: PREFLIGHT_STATUS.WAIT,
      badge: 'STEP 1 REQUIRED: Visit Station',
      isDefective: true,
      currentStep: 'Step 0: Uninitiated',
      nextAction: 'Visit local police station',
      fix: 'You must first approach the police station having jurisdiction under BNSS s.173(1). If you are outside jurisdiction, demand a Zero FIR.'
    };
  }

  if (!stationRefused) {
    return {
      status: PREFLIGHT_STATUS.WAIT,
      badge: 'AWAITING STATION ACTION',
      isDefective: true,
      currentStep: 'Step 1: Station Inquiry Pending',
      nextAction: 'Wait for station FIR registration',
      fix: 'Police may conduct preliminary enquiry up to 14 days for offences punishable by 3-7 years before registration under BNSS s.173(3).'
    };
  }

  // Station refused -> Step 2: Escalate to SP
  if (!sentToSP) {
    return {
      status: PREFLIGHT_STATUS.READY,
      badge: 'READY: Escalate to SP (BNSS s.173(4))',
      isDefective: false,
      currentStep: 'Step 2: SP Escalation',
      nextAction: 'Send written complaint to SP',
      fix: 'Send the substance of your information in writing by registered post to the Superintendent of Police (SP / DCP) under BNSS s.173(4).'
    };
  }

  // SP was approached -> Check if 15 days passed without action
  if (daysSinceSP < 15) {
    const daysLeft = 15 - daysSinceSP;
    return {
      status: PREFLIGHT_STATUS.WAIT,
      badge: `WAIT FOR SP ACTION (${daysLeft} Days)`,
      isDefective: true,
      currentStep: 'Step 2: Awaiting SP Action',
      nextAction: `Allow ${daysLeft} more days for SP inquiry`,
      fix: 'Allow the Superintendent of Police reasonable time (15 days) to direct investigation under s.173(4).'
    };
  }

  // Step 3: Approach Judicial Magistrate under BNSS s.175(3)
  return {
    status: PREFLIGHT_STATUS.READY,
    badge: 'READY: Approach Magistrate (BNSS s.175(3))',
    isDefective: false,
    currentStep: 'Step 3: Judicial Magistrate Application',
    nextAction: 'File application before Judicial Magistrate',
    fix: 'File application before the Judicial Magistrate having jurisdiction under BNSS s.175(3) accompanied by an affidavit of previous efforts.'
  };
}

/**
 * Universal Pre-flight Dispatcher
 * @param {string} categoryId
 * @param {object} fields
 * @returns {object|null}
 */
export function evaluatePreflight(categoryId, fields = {}) {
  switch (categoryId) {
    case 'bank_ombudsman':
      return preflightBank(fields);
    case 'consumer_dispute':
      return preflightConsumer(fields);
    case 'police_fir_refusal':
      return preflightPolice(fields);
    default:
      return null;
  }
}
