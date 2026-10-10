/**
 * Phase 3: Statutory Tracker, Deadline Engine & Export System
 * Computes statutory deadlines from wait_days, produces reminder notifications,
 * escalation drafts for next ladder step, and RFC 5545 .ics calendar files.
 */

/**
 * Calculates statutory deadline and remaining days
 * @param {object} params
 * @param {Date|string} [params.startDate]
 * @param {number} [params.waitDays]
 * @param {Date|string|null} [params.userDeadlineDate]
 * @returns {object} { deadlineDate, formattedDate, daysRemaining, isExpired }
 */
export function calculateDeadline({
  startDate = new Date(),
  waitDays = 30,
  userDeadlineDate = null
} = {}) {
  let targetDate;

  if (userDeadlineDate) {
    targetDate = new Date(userDeadlineDate);
  } else {
    targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + (waitDays || 30));
  }

  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  return {
    deadlineDate: targetDate,
    formattedDate,
    daysRemaining,
    isExpired: daysRemaining < 0
  };
}

/**
 * Generates formatted reminder notification text for SMS/WhatsApp/Push
 * @param {object} params
 * @returns {object} { en: string, hi: string }
 */
export function generateReminderText({
  category = 'Banking Grievance',
  currentForum = 'Bank Internal Grievance Cell',
  deadlineFormatted = '2026-11-10',
  nextStepForum = 'RBI Integrated Ombudsman',
  nextStepUrl = 'https://cms.rbi.org.in'
} = {}) {
  const en = `Haq Saathi Reminder: The statutory resolution window for your ${category} lodged with ${currentForum} ends on ${deadlineFormatted}. If you have not received satisfactory resolution, escalate immediately to ${nextStepForum} at ${nextStepUrl}.`;

  const hi = `हक साथी रिमाइंडर: ${currentForum} में दर्ज आपकी ${category} की वैधानिक समय-सीमा ${deadlineFormatted} को समाप्त हो रही है। यदि उचित समाधान नहीं मिला है, तो तुरंत ${nextStepForum} (${nextStepUrl}) पर मामला आगे बढ़ाएं।`;

  return { en, hi };
}

/**
 * Prepares the formal Escalation Draft for the next forum in the ladder
 * @param {object} params
 * @returns {object} { nextForum, escalationDraftEn, escalationDraftUser }
 */
export function generateEscalationDraft({
  categoryId = 'bank_ombudsman',
  priorComplaintDate = '[DATE_OF_INITIAL_COMPLAINT]',
  initialTicketNumber = '[TICKET_OR_ACK_NUMBER]',
  disputedAmount = '[DISPUTED_AMOUNT]',
  userLanguage = 'en'
} = {}) {
  let nextForum = 'Appropriate Appellate Authority';
  let draftEn = '';
  let draftUser = '';

  switch (categoryId) {
    case 'bank_ombudsman':
      nextForum = 'RBI Integrated Ombudsman (CRPC)';
      draftEn = `To,
The Reserve Bank of India Integrated Ombudsman,
CRPC, Reserve Bank of India, Email: crpc@rbi.org.in | Portal: cms.rbi.org.in

Subject: Escalation under RBI Integrated Ombudsman Scheme 2021 after expiry of 30-day statutory bank resolution period

Respected Ombudsman,

I lodged a formal written grievance with [BANK_NAME] on ${priorComplaintDate} (Reference Ticket: ${initialTicketNumber}) regarding an unauthorized transaction of ${disputedAmount}.

The mandatory statutory period of 30 days under Clause 10 of the Scheme has now expired without resolution / the bank has rejected my claim without justification.

I hereby escalate this complaint to the Hon'ble Ombudsman for statutory intervention, compensation, and reversal of the disputed sum.

Yours faithfully,
[COMPLAINANT_NAME]
Account: [ACCOUNT NUMBER REDACTED]`;
      break;

    case 'police_fir_refusal':
      nextForum = 'Superintendent of Police (SP / DCP) under BNSS s.173(4)';
      draftEn = `To,
The Superintendent of Police (SP) / Deputy Commissioner of Police (DCP),
District Police Headquarters

Subject: Statutory Escalation under BNSS Section 173(4) following Station Refusal of FIR

Respected Sir/Madam,

I submitted information regarding a cognizable offence to the Officer-in-Charge of [POLICE_STATION_NAME] on ${priorComplaintDate}. Despite statutory mandate under BNSS s.173, the station refused to register an FIR or issue a Zero FIR.

In accordance with Section 173(4) of the Bharatiya Nagarik Suraksha Sanhita, 2023, I submit the substance of this information to your office and pray that you investigate the matter or direct the registration of an FIR.

Yours faithfully,
[COMPLAINANT_NAME]`;
      break;

    case 'msme_delayed_payment':
      nextForum = 'MSEFC / MSME ODR Portal (champions.gov.in)';
      draftEn = `To,
The Micro & Small Enterprises Facilitation Council (MSEFC),
Directorate of Industries / MSME ODR Portal

Subject: Delayed Payment Reference under Section 18 of the MSMED Act, 2006

Respected Council Members,

We, a registered Micro/Small enterprise (Udyam: [UDYAM_NUMBER]), delivered supplies/services to [BUYER_COMPANY_NAME] on ${priorComplaintDate}. A statutory demand notice was served, yet the overdue sum of ${disputedAmount} remains unpaid beyond the 45-day statutory ceiling.

We pray for statutory conciliation / arbitration and award of the principal sum with compound interest at 3x the RBI bank rate with monthly rests under Section 16 of the Act.

For [SUPPLIER_NAME]
Authorized Signatory`;
      break;

    default:
      nextForum = 'National Consumer Helpline (1915) / e-Daakhil';
      draftEn = `To,
Appellate Authority / Redressal Commission
Subject: Escalation of Unresolved Consumer Grievance

Having given 30 days written notice on ${priorComplaintDate} to [RESPONDENT_NAME] without relief, I hereby file this formal escalated petition for statutory redressal.

Applicant: [APPLICANT_NAME]`;
      break;
  }

  draftUser = draftEn; // Can be mirrored or translated
  return { nextForum, escalationDraftEn: draftEn, escalationDraftUser: draftUser };
}

/**
 * Generates an RFC 5545 compliant .ics iCalendar file content string
 * @param {object} params
 * @returns {string} ics file string
 */
export function generateIcsContent({
  title = 'Haq Saathi Statutory Deadline',
  description = 'Mandatory statutory waiting period expires today. Escalate if unresolved.',
  deadlineDate = new Date(),
  alarmDaysBefore = 1
} = {}) {
  const d = new Date(deadlineDate);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const dtStamp = `${yyyy}${mm}${dd}T090000Z`;
  const dtEnd = `${yyyy}${mm}${dd}T100000Z`;

  const cleanTitle = title.replace(/[,\n\r]/g, ' ');
  const cleanDesc = description.replace(/[\n\r]/g, '\\n').replace(/,/g, '\\,');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Haq Saathi//Citizen Legal Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:haq-saathi-${Date.now()}@haqsaathi.in`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStamp}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:${cleanDesc}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    `TRIGGER:-P${alarmDaysBefore}D`,
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${cleanTitle}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}
