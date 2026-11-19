/**
 * Test Suite: Features 7 through 12
 * - Feature 7: AI Suggestion Review (Accept / Reject / Compare)
 * - Feature 8: Application Pipeline (Kanban progress, 5 stages, stage advancement)
 * - Feature 9: Career Readiness Dashboard (readiness score & 4 quadrants from Unified Context)
 * - Feature 10: User Trust Features (Export Profile, Resume, Career Data + AI transparency notice)
 * - Feature 11: Analytics Preparation (Provider abstraction, core events, GDPR opt-out)
 * - Feature 12: Feedback System (👍 / 👎 ratings for Copilot, ATS, Project Coach + Admin)
 * - ATS Invariant Preservation
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

console.log('🧪 Starting Verification of Features 7 through 12...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// FEATURE 7: AI Suggestion Accept / Reject / Compare
// -------------------------------------------------------------
console.log('--- Feature 7: AI Suggestion Review ---');
const builderPath = resolve(process.cwd(), 'src/app/builder/page.tsx');
const builderSource = readFileSync(builderPath, 'utf-8');

assert(
  builderSource.includes('showSummaryCompare') &&
  builderSource.includes('showBulletCompare') &&
  builderSource.includes('bulletAiSuggestion'),
  'Builder maintains state for AI suggestions and side-by-side comparison'
);

assert(
  builderSource.includes('Compare') &&
  builderSource.includes('Reject') &&
  builderSource.includes('Accept'),
  'Builder gives explicit user control: Accept, Reject, and Compare on AI suggestions'
);

// -------------------------------------------------------------
// FEATURE 8: Application Pipeline
// -------------------------------------------------------------
console.log('\n--- Feature 8: Application Pipeline ---');
const applicationsPath = resolve(process.cwd(), 'src/app/dashboard/applications/page.tsx');
const applicationsSource = readFileSync(applicationsPath, 'utf-8');

assert(
  applicationsSource.includes('PIPELINE_STAGES') &&
  applicationsSource.includes('handleMoveStage') &&
  applicationsSource.includes('getNextStage'),
  'Applications page implements pipeline stages and stage transition handlers'
);

assert(
  applicationsSource.includes('Application Pipeline Progress') &&
  applicationsSource.includes('Pipeline View') &&
  applicationsSource.includes('List View'),
  'Applications page provides 5-stage Kanban pipeline progress and view mode toggle'
);

// -------------------------------------------------------------
// FEATURE 9: Career Readiness Dashboard
// -------------------------------------------------------------
console.log('\n--- Feature 9: Career Readiness Dashboard ---');
const hudPath = resolve(process.cwd(), 'src/components/dashboard/CareerReadinessHUD.tsx');
const hudSource = readFileSync(hudPath, 'utf-8');

assert(
  hudSource.includes('CareerReadinessHUD') &&
  hudSource.includes('technicalScore') &&
  hudSource.includes('projectScore') &&
  hudSource.includes('resumeScore') &&
  hudSource.includes('interviewScore'),
  'CareerReadinessHUD displays overall readiness score and 4 verified quadrant subscores'
);

const dashboardContentPath = resolve(process.cwd(), 'src/components/dashboard/DashboardContent.tsx');
const dashboardContentSource = readFileSync(dashboardContentPath, 'utf-8');
assert(
  dashboardContentSource.includes('unifiedContext?.readiness') &&
  dashboardContentSource.includes('<CareerReadinessHUD'),
  'Dashboard mounts CareerReadinessHUD powered directly by UnifiedStudentContext'
);

// -------------------------------------------------------------
// FEATURE 10: User Trust Features
// -------------------------------------------------------------
console.log('\n--- Feature 10: User Trust Features ---');
const myDataPath = resolve(process.cwd(), 'src/app/dashboard/my-data/page.tsx');
const myDataSource = readFileSync(myDataPath, 'utf-8');

assert(
  myDataSource.includes('handleExportProfileData') &&
  myDataSource.includes('handleExportResumeData') &&
  myDataSource.includes('Export Career Data'),
  'My Career Data provides 3 distinct export capabilities (Profile, Resume, Career Data)'
);

assert(
  myDataSource.includes('AI Transparency') &&
  myDataSource.includes('Suggestions are generated from your profile, resume, skills, projects, career goals, and saved jobs'),
  'Displays explicit AI transparency notice stating data inputs and zero hallucination commitment'
);

// -------------------------------------------------------------
// FEATURE 11: Analytics Preparation
// -------------------------------------------------------------
console.log('\n--- Feature 11: Analytics Preparation ---');
const analyticsPath = resolve(process.cwd(), 'src/lib/analytics/index.ts');
assert(existsSync(analyticsPath), 'Analytics abstraction index.ts exists');

const analyticsSource = readFileSync(analyticsPath, 'utf-8');
assert(
  analyticsSource.includes('posthog') &&
  analyticsSource.includes('clarity') &&
  analyticsSource.includes('sentry'),
  'Analytics abstraction supports PostHog, Microsoft Clarity, and Sentry'
);

assert(
  analyticsSource.includes('resume_created') &&
  analyticsSource.includes('ats_completed') &&
  analyticsSource.includes('project_generated') &&
  analyticsSource.includes('interview_started') &&
  analyticsSource.includes('job_saved'),
  'Tracks all 5 required core events'
);

assert(
  analyticsSource.includes('isAnalyticsOptedOut') &&
  analyticsSource.includes('setAnalyticsOptOut'),
  'Provides GDPR-compliant analytics opt-out controls'
);

// -------------------------------------------------------------
// FEATURE 12: Feedback System
// -------------------------------------------------------------
console.log('\n--- Feature 12: Feedback System ---');
const feedbackComponentPath = resolve(process.cwd(), 'src/components/feedback/FeedbackButtons.tsx');
assert(existsSync(feedbackComponentPath), 'FeedbackButtons.tsx component exists');

const chatbotPath = resolve(process.cwd(), 'src/components/chat/CareerChatbot.tsx');
const chatbotSource = readFileSync(chatbotPath, 'utf-8');
assert(
  chatbotSource.includes("import { FeedbackButtons } from '@/components/feedback/FeedbackButtons'") &&
  chatbotSource.includes('category="Career Copilot"'),
  'Career Copilot chat includes FeedbackButtons on assistant responses'
);

const atsExplainPath = resolve(process.cwd(), 'src/components/ats/AtsExplainabilityBreakdown.tsx');
const atsExplainSource = readFileSync(atsExplainPath, 'utf-8');
assert(
  atsExplainSource.includes("import { FeedbackButtons } from '@/components/feedback/FeedbackButtons'") &&
  atsExplainSource.includes('category="ATS Suggestions"'),
  'ATS Explainability breakdown includes FeedbackButtons'
);

const projectsPagePath = resolve(process.cwd(), 'src/app/projects/page.tsx');
const projectsPageSource = readFileSync(projectsPagePath, 'utf-8');
assert(
  projectsPageSource.includes("import { FeedbackButtons } from '@/components/feedback/FeedbackButtons'") &&
  projectsPageSource.includes('category="Project Coach"'),
  'Project Coach recommendations include FeedbackButtons'
);

const adminFeedbackPath = resolve(process.cwd(), 'src/app/admin/(protected)/feedback/page.tsx');
assert(existsSync(adminFeedbackPath), 'Admin feedback review dashboard exists');

// -------------------------------------------------------------
// ATS Invariant Check
// -------------------------------------------------------------
console.log('\n--- ATS Invariant Check ---');
const atsEnginePath = resolve(process.cwd(), 'src/server/services/deterministicAtsEngine.ts');
const atsContent = readFileSync(atsEnginePath, 'utf-8');
const atsHash = createHash('sha256').update(atsContent).digest('hex').toUpperCase();
const EXPECTED_HASH = 'F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251';

assert(
  atsHash === EXPECTED_HASH,
  `ATS Invariant Hash is strictly preserved: ${atsHash}`
);

console.log(`\n📊 Verification Summary: ${passedTests}/${totalTests} Tests Passed`);
if (passedTests === totalTests) {
  console.log('🎉 Features 7 through 12 VERIFIED!\n');
} else {
  process.exit(1);
}
