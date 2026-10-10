/**
 * Phase 5: Voice AI & Document Upload Engine
 * - Web Speech API SpeechRecognition adapter for 6 Indian languages (Tier 1 & 2)
 * - Document text extractor with client-side PII sanitization pipeline
 * - Pre-loaded realistic document samples for 1-click hackathon judging & demo
 */

import { redactPii } from './redact.js';

export const SPEECH_LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ur: 'ur-IN',
  mr: 'mr-IN',
  ta: 'ta-IN'
};

/**
 * Checks whether Web Speech API is supported in current browser environment
 */
export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Returns BCP-47 speech recognition language code
 */
export function getSpeechRecognitionLang(langCode = 'hi') {
  return SPEECH_LANG_MAP[langCode] || 'hi-IN';
}

/**
 * Pre-loaded realistic citizen grievance documents for demo & testing
 */
export const DEMO_DOCUMENTS = [
  {
    id: 'kcc_receipt',
    title: 'Kisan Credit Card (PMFBY) Crop Insurance Certificate',
    category: 'PMFBY Crop Loss',
    rawText: `PRADHAN MANTRI FASAL BIMA YOJANA (PMFBY) ACKNOWLEDGEMENT
Policy / Application No: PMFBY-MH-2026-981244
Farmer Name: Ramrao Patil
Aadhaar No: 5432 1098 7654
Phone: +91 9876543210
Bank / KCC Account: State Bank of India, Branch Satara, A/C: 3098765432198
Crop Insured: Cotton (Kharif)
Sum Insured: Rs. 1,45,000 | Premium Paid: Rs. 2,900
Event Reported: Localised Calamity - Severe hailstorm and inundation within 24 hours of harvest.
Intimation Helpline: 14447 (Must be reported within 72 hours of loss).`
  },
  {
    id: 'bank_sms_notice',
    title: 'Unauthorized Bank Debit SMS & Dispute Letter',
    category: 'Banking Ombudsman (CRPC)',
    rawText: `BANK DISPUTE INTIMATION LETTER
To: Branch Manager, HDFC Bank, Connaught Place Branch
Date: 01-10-2026
Subject: Fraudulent UPI transaction reversal request
Aadhaar: 9876 5432 1098 | PAN: ABCDE1234F
Phone: 9811223344
Dear Manager,
On 2026-10-01 at 03:15 AM, an unauthorized withdrawal of Rs. 45,000 was debited from my Account No: 5010023456789012 via UPI handle fraud@fakeupi.
I received SMS alert and immediately called the helpline within 2 hours.
More than 30 days have elapsed without resolution or refund. Under RBI Integrated Ombudsman Scheme 2021 Clause 10, zero liability applies for customer negligence free third-party breaches reported within 3 days.`
  },
  {
    id: 'msme_tax_invoice',
    title: 'MSME Registered Tax Invoice & Delivery Challan',
    category: 'MSME Delayed Payment (MSMED Act)',
    rawText: `TAX INVOICE - STATUTORY DEMAND NOTICE
Supplier: Apex Digital Solutions LLP
Udyam Registration: UDYAM-DL-03-0019283 (Micro Enterprise)
PAN: AABCA1234K | Phone: 9876501234
Buyer: Global Retail Enterprises Private Limited
Invoice No: INV-2026-089 | Invoice Date: 15-08-2026
Goods/Services Delivered: Custom CRM Software Development & API Integration
Principal Overdue Amount: Rs. 6,50,000
Credit Period Agreed: 30 Days | Due Date: 14-09-2026
Days Overdue: 65 Days
Notice: Under Section 15 & 16 of the MSMED Act, 2006, payment delayed beyond 45 days attracts compound interest with monthly rests at three times the RBI Bank Rate (currently 19.50% p.a.). Buyer tax disallowance applies under Section 43B(h) of the Income Tax Act.`
  }
];

/**
 * Document processing pipeline:
 * Extracts text from file, runs client-side PII redaction, and outputs sanitized content for triage
 * @param {object} params
 * @param {string} params.fileName
 * @param {string} params.rawText
 * @returns {object} { sanitizedText, redactionReport, isSanitized }
 */
export function processDocumentText({ fileName = 'document.txt', rawText = '' } = {}) {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Document contains no extractable text content.');
  }

  // Client-side PII sanitization before any AI or triage call
  const redactionReport = redactPii(rawText);

  return {
    fileName,
    originalLength: rawText.length,
    sanitizedText: redactionReport.redactedText,
    redactionReport,
    isSanitized: Object.values(redactionReport.redactedItems).some(count => count > 0)
  };
}
