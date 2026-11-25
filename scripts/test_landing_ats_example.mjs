import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const require = createRequire(import.meta.url);
const { deregisterHook, registerHook } = require('next/dist/build/next-config-ts/require-hook');

registerHook({
  jsc: {
    parser: { syntax: 'typescript' },
  },
  module: { type: 'commonjs' },
  isModule: 'unknown',
  env: { targets: { node: process.versions.node } },
});

const originalLoad = Module._load;
const originalResolveFilename = Module._resolveFilename;
Module._load = function loadForLandingAtsTest(id, ...args) {
  const normalizedId = typeof id === 'string' ? id.replaceAll('\\', '/') : '';
  if (id === 'server-only' || normalizedId.endsWith('/node_modules/server-only/index.js')) {
    return {};
  }
  return originalLoad.apply(this, [id, ...args]);
};
Module._resolveFilename = function resolveLandingAtsTestModule(request, ...args) {
  const resolvedRequest = typeof request === 'string' && request.startsWith('@/')
    ? path.join(projectRoot, 'src', request.slice(2))
    : request;
  return originalResolveFilename.apply(this, [resolvedRequest, ...args]);
};

const {
  LANDING_EXAMPLE_AFTER_TEXT,
  LANDING_EXAMPLE_BEFORE_TEXT,
  LANDING_SCORE_WEIGHTS,
} = require('../src/components/landing/landingExampleData.ts');
const { calculateDeterministicAtsScore } = require(
  '../src/server/services/deterministicAtsEngine.ts',
);

assert.deepEqual(
  LANDING_SCORE_WEIGHTS.map(({ key, weight }) => [key, weight]),
  [
    ['keywords', 0.35],
    ['formatting', 0.25],
    ['content', 0.25],
    ['sections', 0.15],
  ],
  'Landing score weights must stay aligned with the deterministic ATS formula.',
);

const weights = Object.fromEntries(
  LANDING_SCORE_WEIGHTS.map(({ key, weight }) => [key, weight]),
);

const approvedText = fs.readFileSync(
  path.join(projectRoot, 'scripts', 'visual-qa', 'landing', 'batch-3', 'STEP_3A.md'),
  'utf8',
).replaceAll('\r\n', '\n');
const approvedExamples = [...approvedText.matchAll(/```text\n([\s\S]*?)\n```/g)];
assert.equal(approvedExamples.length, 2, 'Step 3a must contain the approved resume pair.');
assert.equal(LANDING_EXAMPLE_BEFORE_TEXT, approvedExamples[0][1], 'The before fixture must match Step 3a exactly.');
assert.equal(LANDING_EXAMPLE_AFTER_TEXT, approvedExamples[1][1], 'The after fixture must match Step 3a exactly.');

const fixtures = [
  {
    label: 'before',
    text: LANDING_EXAMPLE_BEFORE_TEXT,
    expected: { overall: 79, keywords: 60, formatting: 95, content: 75, sections: 100 },
  },
  {
    label: 'after',
    text: LANDING_EXAMPLE_AFTER_TEXT,
    expected: { overall: 82, keywords: 60, formatting: 95, content: 90, sections: 100 },
  },
];

let checks = 4;
for (const fixture of fixtures) {
  const result = calculateDeterministicAtsScore(fixture.text);
  assert.equal(result.overallAtsScore, fixture.expected.overall, `${fixture.label} overall score changed.`);
  checks += 1;
  assert.equal(result.keywordMatchScore, fixture.expected.keywords, `${fixture.label} keyword score changed.`);
  checks += 1;
  assert.equal(result.formattingScore, fixture.expected.formatting, `${fixture.label} formatting score changed.`);
  checks += 1;
  assert.equal(result.contentScore, fixture.expected.content, `${fixture.label} content score changed.`);
  checks += 1;
  assert.equal(result.sectionScore, fixture.expected.sections, `${fixture.label} section score changed.`);
  checks += 1;

  const weightedOverall = Math.round(
    weights.keywords * result.keywordMatchScore +
      weights.content * result.contentScore +
      weights.formatting * result.formattingScore +
      weights.sections * result.sectionScore,
  );
  assert.equal(
    result.overallAtsScore,
    weightedOverall,
    `${fixture.label} overall must equal the landing-side weighted formula.`,
  );
  checks += 1;

  console.log(
    `${fixture.label}: overall ${result.overallAtsScore}, keywords ${result.keywordMatchScore}, ` +
      `formatting ${result.formattingScore}, content ${result.contentScore}, sections ${result.sectionScore}`,
  );
}

let failOnHelperCall = 0;
let helperCalls = 0;
const loadBeforeHelperTest = Module._load;
Module._load = function loadForLandingHelperTest(id, ...args) {
  if (id === '@/server/services/deterministicAtsEngine') {
    return {
      calculateDeterministicAtsScore(text) {
        helperCalls += 1;
        if (helperCalls === failOnHelperCall) throw new Error('Isolated engine failure fixture');
        return calculateDeterministicAtsScore(text);
      },
    };
  }
  return loadBeforeHelperTest.apply(this, [id, ...args]);
};

const { getLandingPageData } = require('../src/lib/landingPageData.server.ts');
const landingData = await getLandingPageData();
assert.equal(helperCalls, 2, 'The shared helper must score both approved texts.');
checks += 1;
assert.equal(landingData.atsExample.status, 'ready');
checks += 1;
assert.deepEqual(JSON.parse(JSON.stringify(landingData)), landingData, 'Landing props must be serializable.');
checks += 1;
assert.deepEqual(
  landingData.atsExample.examples.map(({ overallScore, parts }) => ({
    overall: overallScore,
    ...Object.fromEntries(parts.map(({ key, score }) => [key, score])),
  })),
  fixtures.map(({ expected }) => expected),
  'The helper must pass through the engine scores used by both landing surfaces.',
);
checks += 1;
assert.ok(
  !/"(?:detectedSections|detectedKeywords|missingSections|missingKeywords)"/.test(JSON.stringify(landingData)),
  'Engine section names and keyword lists must not cross into landing props.',
);
checks += 1;
const { RESUME_TEMPLATES } = require('../src/lib/templates.ts');
const { ROLE_PROFILES } = require('../src/lib/career/roleProfiles.ts');
assert.equal(landingData.productFacts.templateCount, RESUME_TEMPLATES.length);
checks += 1;
assert.equal(landingData.productFacts.roleCount, ROLE_PROFILES.length);
checks += 1;
assert.equal(landingData.productFacts.scorePartCount, LANDING_SCORE_WEIGHTS.length);
checks += 1;

helperCalls = 0;
failOnHelperCall = 2;
const unavailableData = await getLandingPageData();
assert.equal(unavailableData.atsExample.status, 'unavailable', 'A failed after example must hide the entire score pair.');
checks += 1;
assert.match(unavailableData.atsExample.message, /temporarily unavailable/);
checks += 1;
assert.ok(!('examples' in unavailableData.atsExample), 'Failure must not expose partial or fallback scores.');
checks += 1;

const { transformSync } = require('next/dist/build/swc');
const previousTsxHook = require.extensions['.tsx'];
require.extensions['.tsx'] = function compileLandingComponent(mod, filename) {
  const { code } = transformSync(fs.readFileSync(filename, 'utf8'), {
    jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
    isModule: 'unknown',
    env: { targets: { node: process.versions.node } },
  });
  mod._compile(code, filename);
};
Module._load = function loadForLandingFallbackRender(id, ...args) {
  if (typeof id === 'string' && id.endsWith('.module.css')) return {};
  return loadBeforeHelperTest.apply(this, [id, ...args]);
};
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { LandingHero } = require('../src/components/landing/sections/Hero.tsx');
const { ScoredByRules } = require('../src/components/landing/sections/ScoredByRules.tsx');
for (const component of [LandingHero, ScoredByRules]) {
  const markup = renderToStaticMarkup(createElement(component, { atsExample: unavailableData.atsExample }));
  assert.match(markup, /The example score is temporarily unavailable/);
  checks += 1;
  assert.doesNotMatch(markup, /role="progressbar"|aria-valuenow=|Overall score|\/100/);
  checks += 1;
}

console.log(`Landing ATS example and failure coverage: ${checks}/${checks} checks passed.`);

Module._load = originalLoad;
Module._resolveFilename = originalResolveFilename;
if (previousTsxHook) require.extensions['.tsx'] = previousTsxHook;
else delete require.extensions['.tsx'];
deregisterHook();
