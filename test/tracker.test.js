import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDeadline,
  generateReminderText,
  generateEscalationDraft,
  generateIcsContent
} from '../src/engine/tracker.js';
import { generateComplaintPdf } from '../src/engine/pdfExport.js';

test('Tracker: calculateDeadline accurately calculates 30-day statutory window', () => {
  const now = new Date('2026-10-10T00:00:00Z');
  const result = calculateDeadline({ startDate: now, waitDays: 30 });

  assert.ok(result.deadlineDate instanceof Date);
  assert.ok(result.formattedDate.startsWith('2026-11-'));
  assert.equal(typeof result.daysRemaining, 'number');
  assert.equal(result.isExpired, false);
});

test('Tracker: calculateDeadline handles past expired dates', () => {
  const pastDate = '2026-01-01';
  const result = calculateDeadline({ userDeadlineDate: pastDate });

  assert.equal(result.formattedDate, '2026-01-01');
  assert.equal(result.isExpired, true);
  assert.ok(result.daysRemaining < 0);
});

test('Tracker: generateReminderText returns bilingual notification templates', () => {
  const reminder = generateReminderText({
    category: 'Bank Ombudsman Grievance',
    currentForum: 'SBI Internal Grievance Cell',
    deadlineFormatted: '2026-11-10',
    nextStepForum: 'RBI Integrated Ombudsman',
    nextStepUrl: 'https://cms.rbi.org.in'
  });

  assert.ok(reminder.en.includes('SBI Internal Grievance Cell'));
  assert.ok(reminder.en.includes('2026-11-10'));
  assert.ok(reminder.en.includes('RBI Integrated Ombudsman'));

  assert.ok(reminder.hi.includes('हक साथी रिमाइंडर'));
  assert.ok(reminder.hi.includes('2026-11-10'));
});

test('Tracker: generateEscalationDraft generates category-specific appellate notices', () => {
  // 1. Bank escalation to RBI Ombudsman
  const bankDraft = generateEscalationDraft({
    categoryId: 'bank_ombudsman',
    priorComplaintDate: '2026-09-01',
    initialTicketNumber: 'SBI-TKT-9912',
    disputedAmount: 'Rs. 45,000'
  });
  assert.ok(bankDraft.nextForum.includes('RBI Integrated Ombudsman'));
  assert.ok(bankDraft.escalationDraftEn.includes('Clause 10 of the Scheme'));
  assert.ok(bankDraft.escalationDraftEn.includes('SBI-TKT-9912'));

  // 2. Police FIR Refusal escalation to SP under BNSS s.173(4)
  const policeDraft = generateEscalationDraft({
    categoryId: 'police_fir_refusal',
    priorComplaintDate: '2026-10-02'
  });
  assert.ok(policeDraft.nextForum.includes('BNSS s.173(4)'));
  assert.ok(policeDraft.escalationDraftEn.includes('Bharatiya Nagarik Suraksha Sanhita, 2023'));

  // 3. MSME Delayed Payment escalation to MSEFC under Section 18
  const msmeDraft = generateEscalationDraft({
    categoryId: 'msme_delayed_payment',
    priorComplaintDate: '2026-08-15',
    disputedAmount: 'Rs. 5,00,000'
  });
  assert.ok(msmeDraft.nextForum.includes('MSEFC'));
  assert.ok(msmeDraft.escalationDraftEn.includes('Section 18 of the MSMED Act, 2006'));
  assert.ok(msmeDraft.escalationDraftEn.includes('3x the RBI bank rate'));
});

test('Tracker: generateIcsContent produces RFC 5545 compliant calendar data with alarm', () => {
  const ics = generateIcsContent({
    title: 'Bank Ombudsman Statutory Deadline',
    description: '30-day bank resolution period expires. Escalate to RBI CRPC.',
    deadlineDate: new Date('2026-11-15T00:00:00Z'),
    alarmDaysBefore: 1
  });

  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('VERSION:2.0\r\n'));
  assert.ok(ics.includes('PRODID:-//Haq Saathi//Citizen Legal Tracker//EN\r\n'));
  assert.ok(ics.includes('BEGIN:VEVENT\r\n'));
  assert.ok(ics.includes('SUMMARY:Bank Ombudsman Statutory Deadline\r\n'));
  assert.ok(ics.includes('BEGIN:VALARM\r\n'));
  assert.ok(ics.includes('TRIGGER:-P1D\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR'));
});

test('PDF Export: generates valid PDF 1.4 binary structure with claims and citations', () => {
  const pdfOutput = generateComplaintPdf({
    title: 'Haq Saathi - Statutory Legal Complaint',
    categoryName: 'Banking Grievance (RBI Ombudsman)',
    complaintText: 'On 2026-10-01, unauthorized debit of Rs 45,000 occurred. Bank failed to reverse within 30 days.',
    claims: [
      'Statutory 30-day bank grievance window elapsed without resolution.',
      'Citizen reported incident within 72 hours of fraudulent SMS alert.'
    ],
    citations: {
      category: 'Banking Grievance',
      rule_note: 'RBI Integrated Ombudsman Scheme 2021 Clause 10'
    },
    disclaimer: 'Ye legal jaankari hai, vakil ki salah nahi.'
  });

  assert.ok(pdfOutput.pdfBytes instanceof Uint8Array);
  assert.ok(pdfOutput.contentLength > 500);

  const pdfString = Buffer.from(pdfOutput.pdfBytes).toString('utf8');
  assert.ok(pdfString.startsWith('%PDF-1.4\n%âãÏÓ\n'));
  assert.ok(pdfString.includes('/Type /Catalog'));
  assert.ok(pdfString.includes('/Type /Page'));
  assert.ok(pdfString.includes('/Type /Font'));
  assert.ok(pdfString.includes('xref\n0 7\n'));
  assert.ok(pdfString.includes('trailer\n<< /Size 7 /Root 1 0 R >>'));
  assert.ok(pdfString.endsWith('%%EOF\n'));
  assert.ok(pdfString.includes('Statutory 30-day bank grievance window elapsed'));
});
