import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = (Module as any)._load;
(Module as any)._load = function (id: string, ...args: any[]) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

const { calculateDeterministicAtsScore } = await import(
  '../src/server/services/deterministicAtsEngine'
);

import {
  FIXTURE_STRONG_FRESHER,
  FIXTURE_EXPERIENCED_SWE,
  FIXTURE_KEYWORD_STUFFED,
  FIXTURE_JUNK_TEXT,
  FIXTURE_MECHANICAL_ENGINEER,
  FIXTURE_SALES_MARKETING,
  FIXTURE_SPARSE_RESUME,
  JD_RELEVANT_SWE,
  JD_UNRELATED_NURSE,
} from './fixtures/ats/fixtures';

const FIXTURES = [
  { name: '1. Strong Fresher (Projects, No Job)', text: FIXTURE_STRONG_FRESHER },
  { name: '2. Experienced Software Engineer', text: FIXTURE_EXPERIENCED_SWE },
  { name: '3. Keyword-Stuffed Resume (No Narrative)', text: FIXTURE_KEYWORD_STUFFED },
  { name: '4. Junk Text with Header Words & Numbers', text: FIXTURE_JUNK_TEXT },
  { name: '5. Strong Mechanical & Mfg Engineer', text: FIXTURE_MECHANICAL_ENGINEER },
  { name: '6. Strong Sales & Marketing Candidate', text: FIXTURE_SALES_MARKETING },
  { name: '7. Sparse Resume (Missing Details)', text: FIXTURE_SPARSE_RESUME },
];

console.log('========================================================================================');
console.log('CURRENT SCORING ENGINE: BASELINE FIXTURE EVALUATION');
console.log('========================================================================================\n');

// 1. General Evaluation (No JD)
console.log('--- TABLE 1: GENERAL SCAN (NO JOB DESCRIPTION) ---');
console.log(
  '| Fixture Name                                  | Overall | Keyword (35%) | Format (25%) | Content (25%) | Section (15%) |'
);
console.log(
  '|-----------------------------------------------|:-------:|:-------------:|:------------:|:-------------:|:-------------:|'
);

for (const f of FIXTURES) {
  const result = calculateDeterministicAtsScore(f.text);
  const nameCol = f.name.padEnd(45, ' ');
  console.log(
    `| ${nameCol} |   ${String(result.overallAtsScore).padStart(3, ' ')}   |      ${String(result.keywordMatchScore).padStart(3, ' ')}      |     ${String(result.formattingScore).padStart(3, ' ')}      |      ${String(result.contentScore).padStart(3, ' ')}      |      ${String(result.sectionScore).padStart(3, ' ')}      |`
  );
}

// 2. Evaluated Against Relevant Software JD
console.log('\n--- TABLE 2: TARGETED SCAN: RELEVANT SWE JOB DESCRIPTION ---');
console.log(
  '| Fixture Name                                  | Overall | Keyword (35%) | Format (25%) | Content (25%) | Section (15%) | Matched Skills |'
);
console.log(
  '|-----------------------------------------------|:-------:|:-------------:|:------------:|:-------------:|:-------------:|:--------------:|'
);

for (const f of FIXTURES) {
  const result = calculateDeterministicAtsScore(f.text, JD_RELEVANT_SWE, 'Senior Full Stack Engineer', 'CloudScale Systems');
  const nameCol = f.name.padEnd(45, ' ');
  const matchedCount = (result.matchedSkills || []).filter((s: any) => s.status === 'matched').length;
  console.log(
    `| ${nameCol} |   ${String(result.overallAtsScore).padStart(3, ' ')}   |      ${String(result.keywordMatchScore).padStart(3, ' ')}      |     ${String(result.formattingScore).padStart(3, ' ')}      |      ${String(result.contentScore).padStart(3, ' ')}      |      ${String(result.sectionScore).padStart(3, ' ')}      |   ${String(matchedCount).padStart(2, ' ')} matched   |`
  );
}

// 3. Evaluated Against Completely Unrelated Healthcare (ICU Nurse) JD
console.log('\n--- TABLE 3: TARGETED SCAN: UNRELATED ICU NURSE JOB DESCRIPTION ---');
console.log(
  '| Fixture Name                                  | Overall | Keyword (35%) | Format (25%) | Content (25%) | Section (15%) | Matched Skills |'
);
console.log(
  '|-----------------------------------------------|:-------:|:-------------:|:------------:|:-------------:|:-------------:|:--------------:|'
);

for (const f of FIXTURES) {
  const result = calculateDeterministicAtsScore(f.text, JD_UNRELATED_NURSE, 'Staff Registered Nurse - ICU', 'Metro Health');
  const nameCol = f.name.padEnd(45, ' ');
  const matchedCount = (result.matchedSkills || []).filter((s: any) => s.status === 'matched').length;
  console.log(
    `| ${nameCol} |   ${String(result.overallAtsScore).padStart(3, ' ')}   |      ${String(result.keywordMatchScore).padStart(3, ' ')}      |     ${String(result.formattingScore).padStart(3, ' ')}      |      ${String(result.contentScore).padStart(3, ' ')}      |      ${String(result.sectionScore).padStart(3, ' ')}      |   ${String(matchedCount).padStart(2, ' ')} matched   |`
  );
}
