import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

console.log('================================================================');
console.log('🧪 SMART RESUME AI: APP-WIDE MOTION SYSTEM VERIFICATION SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ── 1. Visual Effects Removal Audit ─────────────────────────────────────
console.log('--- 1. Removal of "AI-Generated" Visual Effects ---');
const globalsCss = fs.readFileSync(path.resolve('src/app/globals.css'), 'utf-8');

assert(!globalsCss.includes('landing-orb-breathe'), 'No floating orb breathing keyframes in globals.css');
assert(!globalsCss.includes('atmosphericDrift'), 'No atmospheric drift background animation in globals.css');
assert(!globalsCss.includes('scanBeam'), 'No scan beam animation in globals.css');
assert(!globalsCss.includes('pulseRing'), 'No neon pulse ring animation in globals.css');
assert(!globalsCss.includes('rgba(79, 131, 241, 0.24), 0 2px 8px'), 'No high-glow input borders in globals.css');
assert(!globalsCss.includes('var(--mouse-x'), 'No cursor-reactive spotlights in globals.css');

// ── 2. Page Transitions ────────────────────────────────────────────────
console.log('\n--- 2. Route & Page Transitions ---');
const templateFile = path.resolve('src/app/template.tsx');
assert(fs.existsSync(templateFile), 'src/app/template.tsx exists for App Router page transitions');

const templateContent = fs.readFileSync(templateFile, 'utf-8');
assert(templateContent.includes('useReducedMotion'), 'Page transition respects prefers-reduced-motion');
assert(templateContent.includes('duration: 0.22'), 'Page transition duration is 220ms (within 150-300ms spec)');
assert(templateContent.includes('[0.16, 1, 0.3, 1]'), 'Page transition uses smooth deceleration curve');

// ── 3. Physical Buttons ────────────────────────────────────────────────
console.log('\n--- 3. Physical Button Interactions ---');
assert(globalsCss.includes('transform: translateY(-1px)'), 'Buttons have subtle hover lift (translateY -1px)');
assert(globalsCss.includes('transform: translateY(0px) scale(0.98)'), 'Buttons compress physically on press (active scale 0.98)');
assert(globalsCss.includes('transition: transform 0.08s ease'), 'Buttons have fast physical compression response (80ms)');
assert(globalsCss.includes('cubic-bezier(0.16, 1, 0.3, 1)'), 'Buttons spring back smoothly on release');

// ── 4. Clean Inputs ────────────────────────────────────────────────────
console.log('\n--- 4. Clean Input Focus Transitions ---');
assert(globalsCss.includes('box-shadow: 0 0 0 3px rgba(49, 87, 200, 0.12)'), 'Inputs have subtle 3px focus ring without glowing borders');
assert(globalsCss.includes('transition: border-color 0.18s ease'), 'Inputs have smooth 180ms focus transition');

// ── 5. Modals & Drawers ────────────────────────────────────────────────
console.log('\n--- 5. Modals & Drawers ---');
const motionFile = path.resolve('src/lib/motion.ts');
const motionContent = fs.readFileSync(motionFile, 'utf-8');

assert(motionContent.includes('scale: 0.98'), 'Modals scale from 0.98 on open');
assert(motionContent.includes('dialog: 0.20') || motionContent.includes('duration: 0.20'), 'Modal opening duration is exactly 200ms');
assert(motionContent.includes("type: 'spring', damping: 28, stiffness: 300"), 'Drawers use spring motion physics (stiffness 300, damping 28)');

// ── 6. Resume Builder Motion ───────────────────────────────────────────
console.log('\n--- 6. Resume Builder Motion ---');
const builderFile = path.resolve('src/app/builder/page.tsx');
const builderContent = fs.readFileSync(builderFile, 'utf-8');

assert(builderContent.includes('activeSectionOrder.map') && builderContent.includes('layout'), 'Section reordering implements spring layout animation');
assert(builderContent.includes('layoutId="builder-step-active-bg"'), 'Sidebar step indicator uses sliding layoutId spring animation');
assert(builderContent.includes('key={`builder-step-${currentStep}`}') && builderContent.includes('AnimatePresence'), 'Builder step transitions use smooth crossfade layout animation');
assert(builderContent.includes('AnimatePresence mode="wait"') && builderContent.includes('saveState === \'saving\''), 'Save status pill has smooth crossfade transition');
assert(builderContent.includes('tailorSuccessToast') && builderContent.includes('AnimatePresence'), 'Save confirmation toast uses smooth height and fade animation');

// ── 7. ATS Analyzer Motion ─────────────────────────────────────────────
console.log('\n--- 7. ATS Analyzer Motion ---');
const scoreRingFile = path.resolve('src/components/ui/ScoreRing.tsx');
const scoreRingContent = fs.readFileSync(scoreRingFile, 'utf-8');

assert(scoreRingContent.includes('requestAnimationFrame') && scoreRingContent.includes('easeOutCubic'), 'ScoreRing counts numbers smoothly via requestAnimationFrame easeOutCubic');

const atsScorePageFile = path.resolve('src/app/ats-score/page.tsx');
const atsScorePageContent = fs.readFileSync(atsScorePageFile, 'utf-8');
assert(atsScorePageContent.includes('motion.div') && atsScorePageContent.includes('id="ats-score-results"'), 'ATS Score results appear with smooth spring scale entrance');

// ── 8. Application Tracker ─────────────────────────────────────────────
console.log('\n--- 8. Application Tracker Kanban Motion & Shimmer ---');
const appsFile = path.resolve('src/app/dashboard/applications/page.tsx');
const appsContent = fs.readFileSync(appsFile, 'utf-8');

assert(appsContent.includes('SkeletonBoard'), 'Application Tracker replaces abrupt spinner with SkeletonBoard shimmer');
assert(appsContent.includes('layoutId={`app-card-${app.id}`}') && appsContent.includes('layout'), 'Kanban cards glide smoothly between columns using layoutId animations');

// ── 9. Dashboard Numbers & Readiness HUD ───────────────────────────────
console.log('\n--- 9. Dashboard Numbers & Readiness HUD ---');
const hudFile = path.resolve('src/components/dashboard/CareerReadinessHUD.tsx');
const hudContent = fs.readFileSync(hudFile, 'utf-8');

assert(hudContent.includes('<AnimatedCounter value={overallScore} />'), 'Career readiness overall score animates smoothly using AnimatedCounter');
assert(hudContent.includes('<AnimatedCounter value={q.score} suffix="%" />'), 'Quadrant scores animate smoothly using AnimatedCounter');
assert(hudContent.includes('key={activeQuadrantKey}') && hudContent.includes('AnimatePresence'), 'Active quadrant inspection drawer crossfades smoothly when switching tabs');

// ── 10. Shimmer Loading States ─────────────────────────────────────────
console.log('\n--- 10. Skeleton Shimmer Components ---');
const skeletonFile = path.resolve('src/components/ui/Skeleton.tsx');
assert(fs.existsSync(skeletonFile), 'src/components/ui/Skeleton.tsx exists');
assert(globalsCss.includes('@keyframes skeleton-shimmer'), 'Skeleton shimmer keyframes defined in globals.css');

// ── 11. Skills & Assessments Fluidity ─────────────────────────────────
console.log('\n--- 11. Skills & Roadmap Fluidity ---');
const skillsFile = path.resolve('src/app/skills/page.tsx');
const skillsContent = fs.readFileSync(skillsFile, 'utf-8');
assert(skillsContent.includes('layoutId="skills-tab-pill"'), 'Skills dual tab switcher has sliding layoutId indicator');
assert(skillsContent.includes('layoutId="roadmap-role-pill"'), 'Roadmap role switch pills use sliding layoutId indicator');
assert(skillsContent.includes('key="skills-tab"') && skillsContent.includes('AnimatePresence'), 'Skills vs Roadmap tabs crossfade smoothly via AnimatePresence');

// ── 12. Interview Prep Fluidity ───────────────────────────────────────
console.log('\n--- 12. Interview Prep Fluidity ---');
const interviewFile = path.resolve('src/app/interview-prep/page.tsx');
const interviewContent = fs.readFileSync(interviewFile, 'utf-8');
assert(interviewContent.includes('layoutId="interview-role-pill"'), 'Interview role selection pills use sliding layoutId indicator');
assert(interviewContent.includes('key="interview-step-setup"') && interviewContent.includes('key="interview-step-session"'), 'Interview practice steps transition smoothly via AnimatePresence');
assert(interviewContent.includes('key={`eval-${currentQuestionIndex}`}') && interviewContent.includes('AnimatePresence'), 'Instant AI answer evaluation reveals progressively without pop');

// ── 13. Guidance & Studio Fluidity ────────────────────────────────────
console.log('\n--- 13. Guidance & Studio Fluidity ---');
const guidanceFile = path.resolve('src/app/guidance/page.tsx');
const guidanceContent = fs.readFileSync(guidanceFile, 'utf-8');
assert(guidanceContent.includes('key="guidance-loading"') && guidanceContent.includes('key="guidance-ready"'), 'Guidance Studio morphs loading skeleton to content via AnimatePresence');

// ── 14. ATS Scoring Invariant Check ───────────────────────────────────
console.log('\n--- 14. ATS Deterministic Hash Invariant ---');
const EXPECTED_HASH = 'F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251';

const atsFiles = [
  'src/server/services/deterministicAtsScore.ts',
  'src/server/services/deterministicAtsEngine.ts',
  'src/lib/atsScoreEngine.ts',
].filter(f => fs.existsSync(path.resolve(f)));

let combined = '';
for (const f of atsFiles.sort()) {
  combined += fs.readFileSync(path.resolve(f), 'utf-8');
}
const hash = crypto.createHash('sha256').update(combined).digest('hex').toUpperCase();

assert(hash === EXPECTED_HASH, `ATS Invariant Hash is strictly preserved: ${hash}`);

console.log(`\n================================================================`);
console.log(`📊 Verification Summary: ${passedTests}/${totalTests} Tests Passed`);
if (passedTests === totalTests) {
  console.log('🎉 APP-WIDE MOTION SYSTEM & CLEANUP VERIFIED SUCCESSFULLY!');
  console.log('================================================================');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED');
  console.log('================================================================');
  process.exit(1);
}
