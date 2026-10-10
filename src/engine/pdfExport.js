/**
 * Phase 3: Pure JavaScript Zero-Dependency PDF 1.4 Generator
 * Produces valid, standard PDF 1.4 documents with cross-reference tables,
 * typography styling, headers, claims, citations, and statutory disclaimers.
 * Works seamlessly in both Node.js (Uint8Array) and Browser (Blob download).
 */

/**
 * Escapes characters for PDF string literals
 */
function escapePdfText(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Normalizes text to ASCII safe characters for Type 1 Helvetica font.
 * Replaces newlines/tabs with spaces and replaces non-ASCII characters with equivalents.
 */
function sanitizeForPdf(str) {
  if (!str) return '';
  return str
    .replace(/[₹]/g, 'Rs. ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/[^\x20-\x7E\n]/g, (char) => {
      // Gracefully preserve common ASCII or replace with space
      return ' ';
    });
}

/**
 * Wraps text into lines not exceeding maxCharsPerLine
 */
function wrapText(text, maxChars = 75) {
  if (!text) return [];
  const lines = [];
  const rawParagraphs = text.split(/\r?\n/);

  for (const para of rawParagraphs) {
    if (para.trim().length === 0) {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxChars) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Generates a standard PDF 1.4 binary buffer/Uint8Array
 * @param {object} params
 * @param {string} [params.title]
 * @param {string} [params.categoryName]
 * @param {string} [params.complaintText]
 * @param {string[]} [params.claims]
 * @param {object} [params.citations]
 * @param {string} [params.disclaimer]
 * @param {string} [params.dateFormatted]
 * @returns {object} { pdfBytes, blob, download }
 */
export function generateComplaintPdf({
  title = 'HAQ SAATHI - CITIZEN LEGAL COMPLAINT DRAFT',
  categoryName = 'Statutory Grievance Redressal',
  complaintText = '',
  claims = [],
  citations = {},
  disclaimer = 'Ye legal jaankari hai, vakil ki salah nahi (Legal Information Only - BCI Rule 36 Compliant).',
  dateFormatted = new Date().toISOString().split('T')[0]
} = {}) {
  // Prepare lines of text
  const cleanTitle = sanitizeForPdf(title).toUpperCase();
  const cleanCategory = sanitizeForPdf(`CATEGORY: ${categoryName}`);
  const cleanDate = sanitizeForPdf(`DATE OF GENERATION: ${dateFormatted}`);
  const cleanComplaintLines = wrapText(sanitizeForPdf(complaintText), 78);
  const cleanDisclaimerLines = wrapText(sanitizeForPdf(`LEGAL NOTICE: ${disclaimer}`), 78);

  // Build PDF text operations
  // Coordinates in PDF points: A4 = 595 x 842. Margins = 50.
  const pageHeight = 842;
  const pageWidth = 595;
  const leftMargin = 50;
  let currentY = 790;
  const lineHeight = 14;

  const contentStreamLines = [];

  // Helper to add text line
  function addText(text, x, y, font = '/F1', size = 10) {
    contentStreamLines.push(
      `BT`,
      `${font} ${size} Tf`,
      `1 0 0 1 ${x} ${y} Tm`,
      `(${escapePdfText(text)}) Tj`,
      `ET`
    );
  }

  // Draw header line / banner
  contentStreamLines.push(`0.1 0.25 0.55 rg`); // Dark blue fill
  contentStreamLines.push(`${leftMargin} ${currentY - 25} ${pageWidth - 100} 32 re f`);
  contentStreamLines.push(`1 1 1 rg`); // White text for header
  addText(cleanTitle, leftMargin + 10, currentY - 14, '/F2', 13);
  currentY -= 45;

  // Metadata block
  contentStreamLines.push(`0 0 0 rg`); // Black text
  addText(cleanCategory, leftMargin, currentY, '/F2', 10);
  addText(cleanDate, pageWidth - leftMargin - 180, currentY, '/F1', 9);
  currentY -= 15;

  // Horizontal separator rule
  contentStreamLines.push(`0.8 0.8 0.8 RG`);
  contentStreamLines.push(`1 w`);
  contentStreamLines.push(`${leftMargin} ${currentY} m ${pageWidth - leftMargin} ${currentY} l S`);
  currentY -= 20;

  // Section: Complaint Statement
  addText('STATEMENT OF FACTS & CITIZEN GRIEVANCE:', leftMargin, currentY, '/F2', 11);
  currentY -= 18;

  for (const line of cleanComplaintLines) {
    if (currentY < 120) break; // Keep within single page or footer limit
    addText(line, leftMargin, currentY, '/F1', 9.5);
    currentY -= lineHeight;
  }

  currentY -= 10;

  // Section: Verifiable Claims
  if (claims && claims.length > 0 && currentY > 200) {
    addText('VERIFIABLE STATUTORY CLAIMS & TIMELINES:', leftMargin, currentY, '/F2', 10);
    currentY -= 16;
    for (const claim of claims) {
      if (currentY < 130) break;
      const claimLines = wrapText(sanitizeForPdf(`[x] ${claim}`), 75);
      for (const cl of claimLines) {
        addText(cl, leftMargin + 10, currentY, '/F1', 9);
        currentY -= lineHeight;
      }
    }
    currentY -= 10;
  }

  // Section: Citations & Next Steps
  if (citations && currentY > 160) {
    addText('STATUTORY BASIS & FORUM DETAILS:', leftMargin, currentY, '/F2', 10);
    currentY -= 15;
    if (citations.rule_note) {
      const ruleLines = wrapText(sanitizeForPdf(`Rule: ${citations.rule_note}`), 75);
      for (const rl of ruleLines) {
        addText(rl, leftMargin + 10, currentY, '/F1', 8.5);
        currentY -= 12;
      }
    }
  }

  // Footer / Disclaimer Box
  const footerY = 70;
  contentStreamLines.push(`0.95 0.95 0.95 rg`); // Light grey box
  contentStreamLines.push(`${leftMargin} 35 ${pageWidth - 100} 45 re f`);
  contentStreamLines.push(`0.8 0.4 0.1 rg`); // Amber color text
  addText('HAQ SAATHI CITIZEN ASSISTANT DISCLAIMER:', leftMargin + 10, 68, '/F2', 8);
  for (let i = 0; i < cleanDisclaimerLines.length && i < 2; i++) {
    addText(cleanDisclaimerLines[i], leftMargin + 10, 56 - (i * 10), '/F1', 7.5);
  }

  // Assemble Objects
  const streamData = contentStreamLines.join('\n');
  const streamLength = Buffer ? Buffer.byteLength(streamData, 'utf8') : new TextEncoder().encode(streamData).length;

  const objects = [];
  // 1: Catalog
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  // 2: Pages
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
  // 3: Page
  objects.push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 6 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>\nendobj\n`);
  // 4: Regular Font (Helvetica)
  objects.push(`4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`);
  // 5: Bold Font (Helvetica-Bold)
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`);
  // 6: Content Stream
  objects.push(`6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamData}\nendstream\nendobj\n`);

  // Construct binary content with exact byte offsets
  const header = `%PDF-1.4\n%âãÏÓ\n`;
  let currentOffset = (typeof Buffer !== 'undefined') ? Buffer.byteLength(header, 'utf8') : new TextEncoder().encode(header).length;
  const xrefOffsets = [];

  for (let i = 0; i < objects.length; i++) {
    xrefOffsets.push(currentOffset);
    const objBytes = (typeof Buffer !== 'undefined') ? Buffer.byteLength(objects[i], 'utf8') : new TextEncoder().encode(objects[i]).length;
    currentOffset += objBytes;
  }

  const startXref = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of xrefOffsets) {
    xref += String(offset).padStart(10, '0') + ` 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  const fullPdfString = header + objects.join('') + xref + trailer;

  // Convert to Uint8Array
  let pdfBytes;
  if (typeof TextEncoder !== 'undefined') {
    pdfBytes = new TextEncoder().encode(fullPdfString);
  } else if (typeof Buffer !== 'undefined') {
    pdfBytes = new Uint8Array(Buffer.from(fullPdfString, 'utf8'));
  }

  // Create Blob & Download Helper (Browser friendly)
  let blob = null;
  if (typeof Blob !== 'undefined') {
    blob = new Blob([pdfBytes], { type: 'application/pdf' });
  }

  const download = (filename = 'haq-saathi-complaint.pdf') => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const url = window.URL.createObjectURL(blob || new Blob([pdfBytes], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  return {
    pdfBytes,
    blob,
    download,
    contentLength: pdfBytes ? pdfBytes.length : fullPdfString.length
  };
}
