/**
 * PII Redaction Module for Haq Saathi
 * Redacts Aadhaar, PAN, phone numbers, email addresses, and long account numbers.
 * Note: Names and physical addresses are NOT auto-detected per brief guidelines.
 */

// Aadhaar: 12 digits, optional spaces or dashes (e.g., 1234 5678 9012 or 123456789012)
const AADHAAR_REGEX = /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g;

// PAN: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g., ABCDE1234F)
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/gi;

// Indian Mobile numbers: 10 digits starting with 6,7,8,9, optional +91 or 0 prefix
const PHONE_REGEX = /(?:(?:\+91|91|0)[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g;

// Email addresses
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Long bank account numbers: 9 to 18 continuous digits (excluding previously matched phone/aadhaar)
const ACCOUNT_REGEX = /\b\d{9,18}\b/g;

/**
 * Redacts sensitive personal information from raw text.
 * @param {string} text - The input text containing potential PII
 * @returns {{ redactedText: string, redactedItems: { aadhaar: number, pan: number, phone: number, email: number, account: number } }}
 */
export function redactPii(text) {
  if (!text || typeof text !== 'string') {
    return {
      redactedText: '',
      redactedItems: { aadhaar: 0, pan: 0, phone: 0, email: 0, account: 0 }
    };
  }

  const redactedItems = {
    aadhaar: 0,
    pan: 0,
    phone: 0,
    email: 0,
    account: 0
  };

  let redacted = text;

  // 1. Redact Emails
  redacted = redacted.replace(EMAIL_REGEX, () => {
    redactedItems.email += 1;
    return '[EMAIL REDACTED]';
  });

  // 2. Redact PAN
  redacted = redacted.replace(PAN_REGEX, () => {
    redactedItems.pan += 1;
    return '[PAN REDACTED]';
  });

  // 3. Redact Aadhaar (12 digits)
  redacted = redacted.replace(AADHAAR_REGEX, () => {
    redactedItems.aadhaar += 1;
    return '[AADHAAR REDACTED]';
  });

  // 4. Redact Phone Numbers
  redacted = redacted.replace(PHONE_REGEX, () => {
    redactedItems.phone += 1;
    return '[PHONE REDACTED]';
  });

  // 5. Redact remaining 9-18 digit account numbers
  redacted = redacted.replace(ACCOUNT_REGEX, () => {
    redactedItems.account += 1;
    return '[ACCOUNT NUMBER REDACTED]';
  });

  return {
    redactedText: redacted,
    redactedItems
  };
}
