import Module from 'node:module';

const originalLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return originalLoad.apply(this, [id, ...args]);
};

const mode = process.argv[2];
if (mode !== 'quota' && mode !== 'timeout') {
  throw new Error('Expected a quota or timeout scenario.');
}

process.env.GEMINI_API_KEY = 'AIzaSyFallbackScenarioKey1234567890';
process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;

const originalSetTimeout = globalThis.setTimeout;
if (mode === 'quota') {
  globalThis.setTimeout = (callback, delay, ...args) => originalSetTimeout(callback, delay >= 100 ? 1 : delay, ...args);
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: 429, message: 'Quota exceeded for this test scenario.', status: 'RESOURCE_EXHAUSTED' },
  }), { status: 429, headers: { 'Content-Type': 'application/json' } });
} else {
  globalThis.setTimeout = (callback, delay, ...args) => originalSetTimeout(callback, delay === 20000 ? 1 : delay, ...args);
  globalThis.fetch = async () => new Promise(() => {});
}

const career = await import('../src/server/services/careerIntelligence.ts');
const role = 'Graduate Software Engineer';
const skills = await career.performSkillGapAnalysis(['TypeScript', 'React'], role);
const questions = await career.generateInterviewQuestions(role, 'Build reliable web applications.', 'Computer science graduate.');
const evaluation = await career.evaluateInterviewAnswer(
  'Explain how you would design and test an authenticated API endpoint.',
  'I would validate input on the server, authenticate the request, authorize ownership of the target record, and use parameterized database queries. I would test authorized, unauthenticated, malformed, and cross-user cases.',
  role
);
const query = await career.parseNaturalLanguageJobQuery('remote entry-level software engineer jobs in Seattle');

if (
  !skills.analysisSummary ||
  questions.length < 3 ||
  typeof evaluation.score !== 'number' ||
  !query.keywords ||
  !query.location
) {
  process.exit(1);
}

console.log(`CAREER_FALLBACK_OK:${mode}`);
process.exit(0);
