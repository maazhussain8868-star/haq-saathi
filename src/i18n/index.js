import en from '../../i18n/en.json' with { type: 'json' };
import hi from '../../i18n/hi.json' with { type: 'json' };
import te from '../../i18n/te.json' with { type: 'json' };
import ur from '../../i18n/ur.json' with { type: 'json' };
import mr from '../../i18n/mr.json' with { type: 'json' };
import ta from '../../i18n/ta.json' with { type: 'json' };

export const LANGUAGES = { en, hi, te, ur, mr, ta };

export const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', native: 'English', tier: 1, dir: 'ltr', badge: '' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', tier: 1, dir: 'ltr', badge: '' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', tier: 1, dir: 'ltr', badge: '' },
  { code: 'ur', name: 'Urdu', native: 'اردو', tier: 2, dir: 'rtl', badge: 'BETA' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', tier: 2, dir: 'ltr', badge: 'BETA' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', tier: 2, dir: 'ltr', badge: 'BETA' }
];

/**
 * Auto-detects input script and language
 * @param {string} text
 * @returns {string} language code
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';

  // Telugu script
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  // Urdu / Perso-Arabic script
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  // Tamil script
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  // Devanagari script (Marathi vs Hindi distinction)
  if (/[\u0900-\u097F]/.test(text)) {
    // Note: Do not use \b with non-ASCII Unicode
    const marathiMarkers = /(आहे|झाले|केले|पिकाचे|माझे|नुकसान|तक्रार|शेतकरी|गारपीट)/;
    if (marathiMarkers.test(text)) return 'mr';
    return 'hi';
  }

  return 'en';
}

/**
 * Returns translated UI string or fallback
 * @param {string} langCode
 * @param {string} key
 * @returns {string}
 */
export function t(langCode, key) {
  const dict = LANGUAGES[langCode] || LANGUAGES.en;
  return dict[key] || LANGUAGES.en[key] || key;
}

/**
 * Render structured status code into translated user language
 * @param {string} statusCode
 * @param {string} langCode
 * @returns {string}
 */
export function renderStatusCode(statusCode, langCode = 'en') {
  const dict = LANGUAGES[langCode] || LANGUAGES.en;
  switch (statusCode) {
    case 'READY': return dict.status_ready || 'READY TO FILE';
    case 'WAIT': return dict.status_wait || 'WAIT';
    case 'TIME_BARRED': return dict.status_time_barred || 'TIME-BARRED';
    case 'WITHIN_72H': return dict.status_within_72h || 'HOURS LEFT OF 72H WINDOW';
    case 'WINDOW_EXPIRED': return dict.status_window_expired || '72H WINDOW EXPIRED';
    case 'ELIGIBLE': return dict.status_eligible || 'ELIGIBLE FOR LEGAL AID';
    case 'INELIGIBLE': return dict.status_ineligible || 'INELIGIBLE';
    case 'OVERDUE': return dict.status_overdue || 'OVERDUE (3x Bank Rate)';
    default: return statusCode;
  }
}
