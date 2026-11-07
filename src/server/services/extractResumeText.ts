import 'server-only';
import zlib from 'node:zlib';
import mammoth from 'mammoth';

export interface ExtractionResult {
  text: string;
  wordCount: number;
  fileName: string;
  fileType: string;
  method?: 'pdfjs-primary' | 'pdfjs-fallback' | 'raw-stream' | 'gemini-ocr' | 'mammoth' | 'plaintext';
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

/**
 * Detect file format based on magic bytes / binary signatures.
 */
export function detectFileSignature(buffer: Buffer): {
  format: 'pdf' | 'docx' | 'doc' | 'image' | 'text' | 'unknown';
  detail?: string;
} {
  if (!buffer || buffer.length === 0) {
    return { format: 'unknown', detail: 'empty' };
  }

  // PDF signature: %PDF- within the first 1024 bytes (per PDF ISO-32000-1)
  const headerSlice = buffer.subarray(0, Math.min(buffer.length, 1024));
  if (headerSlice.includes(Buffer.from('%PDF-'))) {
    return { format: 'pdf' };
  }

  // DOCX / ZIP signature: PK\x03\x04
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return { format: 'docx' };
  }

  // Legacy Word (.doc) Compound File Binary Format: \xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return { format: 'doc', detail: 'legacy-doc' };
  }

  // PNG signature: \x89PNG\r\n\x1a\n
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { format: 'image', detail: 'png' };
  }

  // JPEG signature: \xFF\xD8\xFF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { format: 'image', detail: 'jpeg' };
  }

  // GIF signature: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { format: 'image', detail: 'gif' };
  }

  // WEBP signature: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { format: 'image', detail: 'webp' };
  }

  // Check if buffer contains predominantly valid UTF-8 / ASCII printable text
  let printableCount = 0;
  const sampleLen = Math.min(buffer.length, 512);
  for (let i = 0; i < sampleLen; i++) {
    const byte = buffer[i];
    if (
      byte === 0x09 || // tab
      byte === 0x0a || // lf
      byte === 0x0d || // cr
      (byte >= 0x20 && byte <= 0x7e) || // ascii printable
      byte >= 0x80 // utf-8 multi-byte
    ) {
      printableCount++;
    }
  }

  if (sampleLen > 0 && printableCount / sampleLen > 0.85) {
    return { format: 'text' };
  }

  return { format: 'unknown' };
}

/**
 * Detect whether a PDF buffer has password encryption flags.
 */
export function isPdfPasswordProtected(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) return false;
  const sample = buffer.toString('latin1');
  // Trailer or catalog /Encrypt indicator
  return /\/Encrypt\s+(\d+\s+\d+\s+R|<<)/i.test(sample);
}

/**
 * Detect whether a PDF buffer contains image objects (scanned document indicator).
 */
export function isPdfScannedImageOnly(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) return false;
  const sample = buffer.toString('latin1');
  return /\/Subtype\s*\/Image|\/Filter\s*\/DCTDecode|\/Filter\s*\/JBIG2Decode|\/Filter\s*\/CCITTFaxDecode/i.test(
    sample
  );
}

/**
 * Enhanced PDF.js page renderer that:
 * 1. Clusters text items into horizontal lines based on Y-coordinates.
 * 2. Sorts items horizontally by X-coordinates within each line.
 * 3. Preserves word spacing without gluing tokens together.
 * 4. Preserves section headings and paragraph line-breaks.
 */
function createEnhancedPageRenderer() {
  return function render_page(pageData: any): Promise<string> {
    const renderOptions = {
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    };

    return pageData.getTextContent(renderOptions).then((textContent: any) => {
      const items = textContent?.items;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return '';
      }

      // Group text items into visual lines (Y-axis clustering)
      // In PDF coordinate space, Y increases from bottom to top
      const lineBuckets: { y: number; items: any[] }[] = [];

      for (const item of items) {
        const text = item.str;
        if (!text && !item.hasEOL) continue;

        const x = Array.isArray(item.transform) ? item.transform[4] : 0;
        const y = Array.isArray(item.transform) ? item.transform[5] : 0;
        const width = item.width || 0;
        const height = item.height || 10;

        let foundBucket = null;
        for (const bucket of lineBuckets) {
          if (Math.abs(bucket.y - y) <= 3) {
            foundBucket = bucket;
            break;
          }
        }

        if (foundBucket) {
          foundBucket.items.push({ text, x, width, height, hasEOL: item.hasEOL });
        } else {
          lineBuckets.push({
            y,
            items: [{ text, x, width, height, hasEOL: item.hasEOL }],
          });
        }
      }

      // Sort lines top to bottom (Y descending)
      lineBuckets.sort((a, b) => b.y - a.y);

      const lines: string[] = [];
      let lastY: number | null = null;

      for (const bucket of lineBuckets) {
        // Sort items left to right (X ascending)
        bucket.items.sort((a, b) => a.x - b.x);

        let lineText = '';
        let prevX: number | null = null;
        let prevWidth = 0;

        for (const item of bucket.items) {
          if (!item.text) continue;
          if (prevX !== null) {
            const gap = item.x - (prevX + prevWidth);
            if (gap > 2 && !lineText.endsWith(' ') && !item.text.startsWith(' ')) {
              lineText += ' ';
            }
          }
          lineText += item.text;
          prevX = item.x;
          prevWidth = item.width;
        }

        const trimmedLine = lineText.trim();
        if (trimmedLine) {
          // Add extra blank line if vertical separation indicates a new section
          if (lastY !== null && lastY - bucket.y > 22) {
            lines.push('');
          }
          lines.push(trimmedLine);
          lastY = bucket.y;
        }
      }

      return lines.join('\n');
    });
  };
}

/**
 * Layer 1 & 2: Primary PDF extraction using PDF.js with custom layout renderer.
 */
async function extractWithPdfJs(
  buffer: Buffer,
  version = 'v2.0.550'
): Promise<string> {
  // Use direct lib import to avoid index.js debug execution
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParseLib = require('pdf-parse/lib/pdf-parse.js');

  const result = await pdfParseLib(buffer, {
    pagerender: createEnhancedPageRenderer(),
    version,
  });

  return typeof result === 'string' ? result : result?.text || '';
}

/**
 * Decodes literal PDF strings: ( ... ) or hexadecimal strings: < ... >
 * Handles UTF-16BE BOM, octal escapes, standard escapes, and ASCII hex.
 */
export function decodePdfString(raw: string): string {
  if (!raw) return '';
  raw = raw.trim();

  // 1. Literal Parentheses String: ( ... )
  if (raw.startsWith('(') && raw.endsWith(')')) {
    let inner = raw.slice(1, -1);

    // UTF-16BE BOM: \xFE\xFF
    if (inner.startsWith('\xFE\xFF') || inner.startsWith('\uFEFF')) {
      inner = inner.slice(2);
      let res = '';
      for (let i = 0; i < inner.length - 1; i += 2) {
        const code = (inner.charCodeAt(i) << 8) | inner.charCodeAt(i + 1);
        res += String.fromCharCode(code);
      }
      return res;
    }

    // Octal escape sequences: \ddd
    inner = inner.replace(/\\([0-7]{1,3})/g, (_, oct) =>
      String.fromCharCode(parseInt(oct, 8))
    );

    // Standard character escapes
    inner = inner.replace(/\\([nrtbf\\()])/g, (_, ch) => {
      switch (ch) {
        case 'n':
          return '\n';
        case 'r':
          return '\r';
        case 't':
          return '\t';
        case 'b':
          return '\b';
        case 'f':
          return '\f';
        case '\\':
          return '\\';
        case '(':
          return '(';
        case ')':
          return ')';
        default:
          return ch;
      }
    });

    // Strip line continuation
    inner = inner.replace(/\\\r?\n/g, '');
    return inner;
  }

  // 2. Hexadecimal String: < ... >
  if (raw.startsWith('<') && raw.endsWith('>')) {
    let hex = raw.slice(1, -1).replace(/\s+/g, '');
    if (hex.length % 2 !== 0) hex += '0';

    // UTF-16BE Hex: starts with FEFF
    if (hex.toUpperCase().startsWith('FEFF')) {
      hex = hex.slice(4);
      let res = '';
      for (let i = 0; i < hex.length; i += 4) {
        const chunk = hex.substring(i, i + 4);
        if (chunk.length === 4) {
          const code = parseInt(chunk, 16);
          if (!isNaN(code) && code > 0) res += String.fromCharCode(code);
        }
      }
      return res;
    }

    // Standard ASCII Hex
    let res = '';
    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(hex.substring(i, i + 2), 16);
      if (
        !isNaN(code) &&
        ((code >= 32 && code <= 126) ||
          code === 10 ||
          code === 13 ||
          code === 9 ||
          code > 126)
      ) {
        res += String.fromCharCode(code);
      }
    }
    return res;
  }

  return '';
}

/**
 * Extracts balanced parenthesis string from text stream.
 */
function extractParenthesesToken(
  text: string,
  startIndex: number
): { token: string; nextIndex: number } | null {
  if (text[startIndex] !== '(') return null;
  let depth = 1;
  let i = startIndex + 1;
  let escaped = false;
  let res = '';

  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (escaped) {
      res += '\\' + ch;
      escaped = false;
    } else if (ch === '\\') {
      escaped = true;
    } else if (ch === '(') {
      depth++;
      res += ch;
    } else if (ch === ')') {
      depth--;
      if (depth > 0) res += ch;
    } else {
      res += ch;
    }
    i++;
  }

  return { token: '(' + res + ')', nextIndex: i };
}

/**
 * Layer 3: Direct Raw Stream Decompressor & PDF Operator Parser.
 * Bypasses damaged xref tables or incompatible font descriptors by directly
 * decompressing and parsing all /Contents and /ObjStm streams.
 */
export function extractPdfRawStreams(buffer: Buffer): string {
  const binary = buffer.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  const sectionTexts: string[] = [];

  while ((match = streamRegex.exec(binary)) !== null) {
    const streamStart = match.index + match[0].indexOf('\n') + 1;
    const preHeader = binary.substring(Math.max(0, match.index - 600), match.index);

    // Skip non-content streams (images, font programs, icc profiles)
    if (
      /\/Subtype\s*\/Image|\/Subtype\s*\/Type1C|\/Subtype\s*\/CIDFontType0C|\/Type\s*\/Metadata/i.test(
        preHeader
      )
    ) {
      continue;
    }

    const isFlate = /\/Filter\s*(?:\[\s*\/FlateDecode\s*\]|\/FlateDecode)/i.test(preHeader);

    let streamRaw: Buffer;
    const lenMatch = /\/Length\s+(\d+)/i.exec(preHeader);
    if (lenMatch) {
      const explicitLen = parseInt(lenMatch[1], 10);
      if (explicitLen > 0 && streamStart + explicitLen <= buffer.length) {
        streamRaw = buffer.subarray(streamStart, streamStart + explicitLen);
      } else {
        const streamEnd = match.index + match[0].length - (match[0].endsWith('\r\nendstream') ? 11 : 10);
        streamRaw = buffer.subarray(streamStart, streamEnd);
      }
    } else {
      const streamEnd = match.index + match[0].length - (match[0].endsWith('\r\nendstream') ? 11 : 10);
      streamRaw = buffer.subarray(streamStart, streamEnd);
    }

    let decompressed: Buffer = streamRaw;
    if (isFlate) {
      try {
        decompressed = zlib.inflateSync(streamRaw);
      } catch {
        try {
          decompressed = zlib.inflateRawSync(streamRaw);
        } catch {
          decompressed = streamRaw;
        }
      }
    }

    const content = decompressed.toString('latin1');
    // Only process streams that contain PDF text operators (BT, ET, Tj, TJ)
    if (content.includes('BT') || content.includes('Tj') || content.includes('TJ')) {
      const parsedText = parsePdfContentOperators(content);
      if (parsedText && parsedText.trim().length > 0) {
        sectionTexts.push(parsedText.trim());
      }
    }
  }

  return sectionTexts.join('\n\n');
}

/**
 * Parses PDF text operators (BT, ET, Tj, TJ, Td, TD, T*, ', ") from decompressed stream.
 */
function parsePdfContentOperators(content: string): string {
  const lines: string[] = [];
  let currentLine = '';

  let i = 0;
  const len = content.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && (content[i] === ' ' || content[i] === '\t' || content[i] === '\r' || content[i] === '\n')) {
      i++;
    }
    if (i >= len) break;

    // Check for string literal (...)
    if (content[i] === '(') {
      const paren = extractParenthesesToken(content, i);
      if (paren) {
        i = paren.nextIndex;
        // Check following operator
        while (i < len && (content[i] === ' ' || content[i] === '\t')) i++;
        if (content.startsWith('Tj', i)) {
          const dec = decodePdfString(paren.token);
          if (dec) {
            if (currentLine && !currentLine.endsWith(' ') && !dec.startsWith(' ')) {
              currentLine += ' ';
            }
            currentLine += dec;
          }
          i += 2;
        } else if (content[i] === "'") {
          const dec = decodePdfString(paren.token);
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = dec;
          i += 1;
        }
        continue;
      }
    }

    // Check for hex string <...>
    if (content[i] === '<' && content[i + 1] !== '<') {
      const endHex = content.indexOf('>', i);
      if (endHex !== -1) {
        const hexToken = content.substring(i, endHex + 1);
        i = endHex + 1;
        while (i < len && (content[i] === ' ' || content[i] === '\t')) i++;
        if (content.startsWith('Tj', i)) {
          const dec = decodePdfString(hexToken);
          if (dec) {
            if (currentLine && !currentLine.endsWith(' ') && !dec.startsWith(' ')) {
              currentLine += ' ';
            }
            currentLine += dec;
          }
          i += 2;
        }
        continue;
      }
    }

    // Check for array text [ ... ] TJ
    if (content[i] === '[') {
      const endBracket = content.indexOf(']', i);
      if (endBracket !== -1) {
        const arrayInner = content.substring(i + 1, endBracket);
        i = endBracket + 1;
        while (i < len && (content[i] === ' ' || content[i] === '\t')) i++;
        if (content.startsWith('TJ', i)) {
          let arrayText = '';
          let k = 0;
          while (k < arrayInner.length) {
            while (k < arrayInner.length && (arrayInner[k] === ' ' || arrayInner[k] === '\t')) k++;
            if (k >= arrayInner.length) break;

            if (arrayInner[k] === '(') {
              const p = extractParenthesesToken(arrayInner, k);
              if (p) {
                const dec = decodePdfString(p.token);
                if (dec) arrayText += dec;
                k = p.nextIndex;
                continue;
              }
            } else if (arrayInner[k] === '<' && arrayInner[k + 1] !== '<') {
              const endH = arrayInner.indexOf('>', k);
              if (endH !== -1) {
                const dec = decodePdfString(arrayInner.substring(k, endH + 1));
                if (dec) arrayText += dec;
                k = endH + 1;
                continue;
              }
            } else {
              // Kerning number or operator
              const numMatch = /^[-+]?\d*\.?\d+/.exec(arrayInner.substring(k));
              if (numMatch) {
                const n = parseFloat(numMatch[0]);
                if (!isNaN(n) && n < -120 && !arrayText.endsWith(' ')) {
                  arrayText += ' ';
                }
                k += numMatch[0].length;
                continue;
              }
            }
            k++;
          }

          if (arrayText.trim()) {
            if (currentLine && !currentLine.endsWith(' ') && !arrayText.startsWith(' ')) {
              currentLine += ' ';
            }
            currentLine += arrayText;
          }
          i += 2;
        }
        continue;
      }
    }

    // Match word tokens: T*, Td, TD, ET
    const wordMatch = /^[A-Za-z*'"/]+/.exec(content.substring(i));
    if (wordMatch) {
      const word = wordMatch[0];
      if (word === 'T*' || word === 'ET') {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
      } else if (word === 'Td' || word === 'TD') {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
      }
      i += word.length;
      continue;
    }

    i++;
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
}

/**
 * Layer 4: Multimodal Gemini OCR Fallback for Scanned / Image-Only PDFs.
 */
async function extractWithGeminiOcr(buffer: Buffer): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const aiClient = new GoogleGenAI({ apiKey });

    const base64Data = buffer.toString('base64');
    const response = await Promise.race([
      aiClient.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: 'Perform high-accuracy optical character recognition (OCR) on this resume document. Extract all text verbatim, preserving candidate name, contact information, section headings, work experience, education, skills, and bullet points. Do not add commentary or summary—output only the extracted text content.',
              },
            ],
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR Timeout')), 15000)
      ),
    ]);

    const ocrText = response?.text;
    if (ocrText && typeof ocrText === 'string' && ocrText.trim().length >= 20) {
      return ocrText.trim();
    }
  } catch (err) {
    console.warn('[Gemini OCR Fallback] OCR attempt failed or timed out:', err);
  }

  return null;
}

/**
 * Extracts raw textual content from uploaded PDF, DOCX, or TXT file buffers.
 * Enforces file size limits, signature validation, multi-layer PDF cascades,
 * and distinct error messages for corruption, passwords, empty files, and scanned documents.
 */
export async function extractResumeText(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ExtractionResult> {
  // 1. Zero-byte check
  if (!buffer || buffer.length === 0) {
    throw new Error('The uploaded file is empty (0 bytes). Please upload a valid resume document.');
  }

  // 2. File size limit
  if (buffer.length > MAX_FILE_SIZE) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    throw new Error(`File size exceeds the 10MB limit (uploaded: ${sizeMb} MB). Please upload a smaller file.`);
  }

  const lowerName = (fileName || '').toLowerCase();
  const signature = detectFileSignature(buffer);

  // 3. Reject legacy Word files by signature or extension
  if (
    signature.format === 'doc' ||
    (lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) ||
    (mimeType === 'application/msword' && !lowerName.endsWith('.docx'))
  ) {
    throw new Error(
      'Legacy Word (.doc) files are not supported. Please save your resume as modern Word (.docx) or PDF and try again.'
    );
  }

  // 4. Reject image files by signature or extension
  if (
    signature.format === 'image' ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.gif') ||
    (mimeType && mimeType.startsWith('image/'))
  ) {
    throw new Error(
      'Image files are not supported directly. Please convert your resume to a text-based PDF or DOCX document.'
    );
  }

  let extracted = '';
  let fileType = 'unknown';
  let method: ExtractionResult['method'] = undefined;

  // ---------------------------------------------------------------------------
  // A. PDF Extraction Pipeline
  // ---------------------------------------------------------------------------
  if (
    signature.format === 'pdf' ||
    lowerName.endsWith('.pdf') ||
    mimeType === 'application/pdf'
  ) {
    fileType = 'pdf';

    // Verify PDF header magic bytes (%PDF-)
    if (signature.format !== 'pdf') {
      throw new Error(
        'Invalid file format. The uploaded file has a .pdf extension but does not contain a valid PDF signature.'
      );
    }

    // Check for password protection
    if (isPdfPasswordProtected(buffer)) {
      throw new Error(
        'This PDF file is password-protected. Please remove password protection or upload an unprotected copy.'
      );
    }

    // Layer 1: PDF.js primary extraction with enhanced line clustering
    try {
      extracted = await extractWithPdfJs(buffer, 'v2.0.550');
      if (extracted && extracted.trim().length >= 20) {
        method = 'pdfjs-primary';
      }
    } catch (err: unknown) {
      const errMsg = String(err).toLowerCase();
      if (errMsg.includes('password') || errMsg.includes('encrypted')) {
        throw new Error(
          'This PDF file is password-protected. Please remove password protection or upload an unprotected copy.'
        );
      }
      console.warn('[PDF Extraction Layer 1] Primary PDF.js attempt failed, falling back to Layer 2:', err);
    }

    // Layer 2: PDF.js alternate version fallback
    if (!extracted || extracted.trim().length < 20) {
      try {
        extracted = await extractWithPdfJs(buffer, 'v1.10.100');
        if (extracted && extracted.trim().length >= 20) {
          method = 'pdfjs-fallback';
        }
      } catch (err: unknown) {
        const errMsg = String(err).toLowerCase();
        if (errMsg.includes('password') || errMsg.includes('encrypted')) {
          throw new Error(
            'This PDF file is password-protected. Please remove password protection or upload an unprotected copy.'
          );
        }
        console.warn('[PDF Extraction Layer 2] Alternate PDF.js attempt failed, falling back to Layer 3:', err);
      }
    }

    // Layer 3: Direct Raw Stream & Object Decompressor (resilient to corrupt xref tables)
    if (!extracted || extracted.trim().length < 20) {
      try {
        const streamText = extractPdfRawStreams(buffer);
        if (streamText && streamText.trim().length >= 20) {
          extracted = streamText;
          method = 'raw-stream';
        }
      } catch (err) {
        console.warn('[PDF Extraction Layer 3] Raw stream extraction failed:', err);
      }
    }

    // Layer 4: Gemini Multimodal OCR Fallback for Scanned / Image-Only PDFs
    if (!extracted || extracted.trim().length < 20) {
      const isScanned = isPdfScannedImageOnly(buffer);

      if (isScanned) {
        const ocrResult = await extractWithGeminiOcr(buffer);
        if (ocrResult && ocrResult.length >= 20) {
          extracted = ocrResult;
          method = 'gemini-ocr';
        } else {
          throw new Error(
            'No readable text found in this PDF. It appears to be a scanned document or image-only file. Please upload a text-based PDF or DOCX file, or use our Resume Builder.'
          );
        }
      } else {
        // Not a scanned document, but all 3 local parsers found 0 readable text
        // Check if file is genuinely empty / corrupt
        const binary = buffer.toString('latin1');
        if (!binary.includes('/Pages') && !binary.includes('/Catalog')) {
          throw new Error(
            'The PDF file is corrupted or contains no readable pages or structure. Please verify your file before uploading.'
          );
        }

        throw new Error(
          'No readable text found in this PDF. Please ensure your PDF contains selectable text or export a fresh copy from your word processor.'
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // B. DOCX Extraction Pipeline
  // ---------------------------------------------------------------------------
  else if (
    signature.format === 'docx' ||
    lowerName.endsWith('.docx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    fileType = 'docx';
    method = 'mammoth';

    try {
      const result = await mammoth.extractRawText({ buffer });
      extracted = result.value || '';
    } catch (err: unknown) {
      console.error('[DOCX Extraction Error]:', err);
      throw new Error(
        'The DOCX file is corrupted or unreadable. Please check the file and try again.'
      );
    }

    if (!extracted || extracted.trim().length < 20) {
      throw new Error(
        'The DOCX file contains insufficient readable text. Please ensure your resume has textual content and try again.'
      );
    }
  }

  // ---------------------------------------------------------------------------
  // C. Plain Text (.txt) Extraction Pipeline
  // ---------------------------------------------------------------------------
  else if (
    signature.format === 'text' ||
    lowerName.endsWith('.txt') ||
    mimeType === 'text/plain'
  ) {
    fileType = 'txt';
    method = 'plaintext';

    try {
      extracted = buffer.toString('utf-8');
    } catch (err: unknown) {
      console.error('[TXT Extraction Error]:', err);
      throw new Error('The TXT file could not be read. Please ensure it is UTF-8 encoded.');
    }

    if (!extracted || extracted.trim().length < 20) {
      throw new Error(
        'The text file contains insufficient readable content (minimum 20 characters required).'
      );
    }
  } else {
    throw new Error('Invalid file type. Please upload a PDF, DOCX, or TXT file.');
  }

  // Clean extracted text: collapse excessive whitespace while strictly preserving line breaks
  const cleanedText = extracted
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleanedText || cleanedText.length < 20) {
    throw new Error('The extracted document text is too short to perform a reliable ATS analysis.');
  }

  const words = cleanedText.split(/\s+/).filter(Boolean);

  return {
    text: cleanedText,
    wordCount: words.length,
    fileName,
    fileType,
    method,
  };
}
