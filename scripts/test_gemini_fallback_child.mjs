import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

const mode = process.argv[2]; // 'invalid', 'missing', 'quota', or 'timeout'
if (mode === 'invalid') {
  process.env.GEMINI_API_KEY = 'AIzaSyFakeInvalidKeyForTestingFallback12345';
  process.env.GOOGLE_API_KEY = 'AIzaSyFakeInvalidKeyForTestingFallback12345';
} else if (mode === 'quota' || mode === 'timeout') {
  process.env.GEMINI_API_KEY = 'AIzaSyFallbackScenarioKey1234567890';
  process.env.GOOGLE_API_KEY = 'AIzaSyFallbackScenarioKey1234567890';
  if (mode === 'quota') {
    globalThis.fetch = async () => new Response(JSON.stringify({
      error: { code: 429, message: 'Quota exceeded for this test scenario.', status: 'RESOURCE_EXHAUSTED' },
    }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  } else {
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (callback, delay, ...args) => originalSetTimeout(callback, (delay === 12000 || delay === 20000 || delay >= 10000) ? 1 : delay, ...args);
    globalThis.fetch = async () => new Promise(() => {});
  }
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

if (
  typeof res.overallAtsScore !== 'number' ||
  !Array.isArray(res.detectedKeywords) ||
  res.topSuggestions.length === 0 ||
  ((mode === 'quota' || mode === 'timeout' || mode === 'invalid' || mode === 'missing') && res.analysisEngine !== 'deterministic-ats')
) {
  process.exit(1);
}

console.log(`FALLBACK_OK:${mode || 'missing'}`);
process.exit(0);
