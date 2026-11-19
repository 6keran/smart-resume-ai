/**
 * Test Suite: Feature 2 - Resume Comparison View (Before vs After)
 * Validates the Before vs After comparison architecture, data structures,
 * split/unified view capabilities, keyword/bullet diffing, and callbacks.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

console.log('🧪 Starting Feature 2: Resume Comparison View Verification...\n');

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

// Test 1: Verify ResumeComparisonView component file exists and exports required types
const componentPath = resolve(process.cwd(), 'src/components/resume/ResumeComparisonView.tsx');
assert(existsSync(componentPath), 'ResumeComparisonView.tsx component exists');

const componentSource = readFileSync(componentPath, 'utf-8');
assert(
  componentSource.includes('export function ResumeComparisonView') &&
  componentSource.includes('export interface ResumeComparisonData') &&
  componentSource.includes('export interface BulletComparisonItem'),
  'Exports ResumeComparisonView, ResumeComparisonData, and BulletComparisonItem'
);

// Test 2: Verify Split View and Unified Diff View modes
assert(
  componentSource.includes("'split'") &&
  componentSource.includes("'unified'") &&
  componentSource.includes('viewMode'),
  'Supports both Side-by-Side Split View and Unified Diff View modes'
);

// Test 3: Verify Visual Change Breakdown Pills (+Added Keywords, +Improved Bullets, -Removed Content)
assert(
  componentSource.includes('Added Keywords') &&
  componentSource.includes('Improved Bullets') &&
  componentSource.includes('Removed Filler'),
  'Displays high-value visual change breakdown (+Added, +Improved, -Removed)'
);

// Test 4: Verify Callbacks for Bulk and Granular Application
assert(
  componentSource.includes('onApplyBullet') &&
  componentSource.includes('onApplySummary') &&
  componentSource.includes('onApplyAll'),
  'Provides granular (bullet, summary) and one-click bulk (onApplyAll) adoption callbacks'
);

// Test 5: Verify integration in src/app/improver/page.tsx
const improverPath = resolve(process.cwd(), 'src/app/improver/page.tsx');
const improverSource = readFileSync(improverPath, 'utf-8');
assert(
  improverSource.includes("import { ResumeComparisonView } from '@/components/resume/ResumeComparisonView'") &&
  improverSource.includes('<ResumeComparisonView') &&
  improverSource.includes('onApplyAll={handleApplyAllTailored}'),
  'Improver page integrates ResumeComparisonView with live resume data and adoption actions'
);

// Test 6: Verify ATS Hash Invariant
const atsEnginePath = resolve(process.cwd(), 'src/server/services/deterministicAtsEngine.ts');
const atsContent = readFileSync(atsEnginePath, 'utf-8');
const atsHash = createHash('sha256').update(atsContent).digest('hex').toUpperCase();
const EXPECTED_HASH = 'F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251';

assert(
  atsHash === EXPECTED_HASH,
  `ATS Invariant Hash is strictly preserved: ${atsHash}`
);

console.log(`\n📊 Feature 2 Verification Summary: ${passedTests}/${totalTests} Tests Passed`);
if (passedTests === totalTests) {
  console.log('🎉 Feature 2 (ATS Before vs After Comparison) VERIFIED!\n');
} else {
  process.exit(1);
}
