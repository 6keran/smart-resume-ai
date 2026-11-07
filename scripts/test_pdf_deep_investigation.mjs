import zlib from 'node:zlib';

function extractTextFromPdfStreams(buffer) {
  const binary = buffer.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let allExtracted = [];

  while ((match = streamRegex.exec(binary)) !== null) {
    const streamStart = match.index + match[0].indexOf('\n') + 1;
    // Extract slice from buffer directly to preserve exact bytes
    // Find the stream header dictionary preceding this stream
    const preHeader = binary.substring(Math.max(0, match.index - 500), match.index);
    const isFlate = /\/Filter\s*(?:\[\s*\/FlateDecode\s*\]|\/FlateDecode)/i.test(preHeader);

    // Get length from header if present, or length of match
    let streamRaw;
    const lenMatch = /\/Length\s+(\d+)/i.exec(preHeader);
    if (lenMatch) {
      const explicitLen = parseInt(lenMatch[1], 10);
      streamRaw = buffer.subarray(streamStart, streamStart + explicitLen);
    } else {
      const streamEnd = match.index + match[0].length - (match[0].endsWith('\r\nendstream') ? 11 : 10);
      streamRaw = buffer.subarray(streamStart, streamEnd);
    }

    let decompressed;
    if (isFlate) {
      try {
        decompressed = zlib.inflateSync(streamRaw);
      } catch {
        try {
          decompressed = zlib.inflateRawSync(streamRaw);
        } catch {
          // Keep raw if decompression failed
          decompressed = streamRaw;
        }
      }
    } else {
      decompressed = streamRaw;
    }

    const textContent = decompressed.toString('latin1');
    // Parse PDF text operators: (string) Tj, [(string)...] TJ, etc.
    const textTokens = parsePdfTextOperators(textContent);
    if (textTokens) {
      allExtracted.push(textTokens);
    }
  }

  return allExtracted.join('\n\n');
}

function parsePdfTextOperators(content) {
  const textPieces = [];
  // Match Tj: (Text) Tj or <Hex> Tj
  // Match TJ: [ (Text) -200 (Text) ] TJ
  // Match ' and "
  const tjRegex = /(?:\((?:\\.|[^()\\])*\)|<[0-9a-fA-F\s]+>)\s*Tj/g;
  const arrayTjRegex = /\[([\s\S]*?)\]\s*TJ/g;

  let match;
  while ((match = tjRegex.exec(content)) !== null) {
    const raw = match[0].replace(/\s*Tj$/, '').trim();
    const str = decodePdfString(raw);
    if (str) textPieces.push(str);
  }

  while ((match = arrayTjRegex.exec(content)) !== null) {
    const inner = match[1];
    const innerPieces = [];
    const itemRegex = /\((?:\\\(|\\\)|[^()])*\)|<[0-9a-fA-F\s]+>/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(inner)) !== null) {
      const str = decodePdfString(itemMatch[0]);
      if (str) innerPieces.push(str);
    }
    if (innerPieces.length > 0) {
      textPieces.push(innerPieces.join(' '));
    }
  }

  return textPieces.join('\n');
}

function decodePdfString(raw) {
  if (raw.startsWith('(') && raw.endsWith(')')) {
    let unescaped = raw.slice(1, -1);
    unescaped = unescaped.replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
    unescaped = unescaped.replace(/\\([nrtbf\\])/g, (_, ch) => {
      switch (ch) {
        case 'n': return '\n';
        case 'r': return '\r';
        case 't': return '\t';
        case 'b': return '\b';
        case 'f': return '\f';
        case '\\': return '\\';
        default: return ch;
      }
    });
    return unescaped;
  }
  if (raw.startsWith('<') && raw.endsWith('>')) {
    const hex = raw.slice(1, -1).replace(/\s+/g, '');
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substring(i, i + 2), 16);
      if (!isNaN(byte) && byte > 0) str += String.fromCharCode(byte);
    }
    return str;
  }
  return '';
}

// Test on the exact same streamPdf where pdf-parse threw 'bad XRef entry'!
const rawStreamText = 'BT /F1 12 Tf 72 712 Td (Sarah Jenkins - Senior Cloud Architect) Tj 0 -18 Td (AWS, Kubernetes, Terraform, Docker, TypeScript) Tj ET';
const deflated = zlib.deflateSync(Buffer.from(rawStreamText, 'utf-8'));

const streamPdf = Buffer.concat([
  Buffer.from(`%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${deflated.length} /Filter /FlateDecode >>
stream
`),
  deflated,
  Buffer.from(`
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
450
%%EOF`),
]);

const extracted = extractTextFromPdfStreams(streamPdf);
console.log('Stream extraction result:\n', extracted);
