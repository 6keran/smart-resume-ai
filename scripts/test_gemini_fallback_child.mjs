import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

const mode = process.argv[2]; // 'invalid' or 'missing'
if (mode === 'invalid') {
  process.env.GEMINI_API_KEY = 'AIzaSyFakeInvalidKeyForTestingFallback12345';
  process.env.GOOGLE_API_KEY = 'AIzaSyFakeInvalidKeyForTestingFallback12345';
} else {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
}

const gemini = await import('../src/server/services/gemini.ts');
const res = await gemini.analyzeResume(
  'Experienced software engineer with React, TypeScript, and SQL experience.',
  undefined,
  undefined,
  undefined
);

if (typeof res.overallAtsScore !== 'number' || !Array.isArray(res.detectedKeywords) || res.topSuggestions.length === 0) {
  process.exit(1);
}

console.log('FALLBACK_OK');
process.exit(0);
