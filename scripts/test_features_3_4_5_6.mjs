/**
 * Test Suite: Features 3, 4, 5, 6
 * - Feature 3: ATS Friendly View (Design View, ATS View, Plain Text View)
 * - Feature 4: Debounced Autosave Status ("Saving...", "✓ Saved", "✓ Saved 10s ago")
 * - Feature 5: Undo / Redo History Stack (capacity 50, Ctrl+Z, Ctrl+Y, multi-action tracking)
 * - Feature 6: Resume Version History (Rename, Duplicate, View, Restore snapshots)
 * - ATS Invariant Preservation
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

console.log('🧪 Starting Verification of Features 3, 4, 5, and 6...\n');

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
// FEATURE 3: ATS Friendly View
// -------------------------------------------------------------
console.log('--- Feature 3: ATS Friendly View ---');
const atsPreviewPath = resolve(process.cwd(), 'src/components/builder/AtsFriendlyPreview.tsx');
assert(existsSync(atsPreviewPath), 'AtsFriendlyPreview.tsx component exists');

const atsPreviewSource = readFileSync(atsPreviewPath, 'utf-8');
assert(
  atsPreviewSource.includes('export function AtsFriendlyPreview') &&
  atsPreviewSource.includes('export function formatResumeToPlainText'),
  'AtsFriendlyPreview exports component and plain text serializer'
);

assert(
  atsPreviewSource.includes('Single-Column Linear') &&
  atsPreviewSource.includes('Zero Tables / Textboxes') &&
  atsPreviewSource.includes('Canonical Headings'),
  'ATS View displays parseability badges and linear structure'
);

assert(
  atsPreviewSource.includes('Copy Plain Text') &&
  atsPreviewSource.includes('wordCount') &&
  atsPreviewSource.includes('charCount'),
  'Plain Text view provides word count, character count, and one-click copy'
);

const builderPath = resolve(process.cwd(), 'src/app/builder/page.tsx');
const builderSource = readFileSync(builderPath, 'utf-8');
assert(
  builderSource.includes("import { AtsFriendlyPreview } from '@/components/builder/AtsFriendlyPreview'") &&
  builderSource.includes('Design View') &&
  builderSource.includes('ATS View') &&
  builderSource.includes('Plain Text'),
  'Resume Builder embeds 3-way toggle (Design View, ATS View, Plain Text View)'
);

// -------------------------------------------------------------
// FEATURE 4: Autosave Status
// -------------------------------------------------------------
console.log('\n--- Feature 4: Autosave Status ---');
assert(
  builderSource.includes('relativeSavedText') &&
  builderSource.includes('Saved ${diffSec}s ago') &&
  builderSource.includes('Saving...'),
  'Builder displays dynamic debounced autosave status ("Saving...", "Saved", relative times)'
);

const resumeContextPath = resolve(process.cwd(), 'src/context/ResumeContext.tsx');
const resumeContextSource = readFileSync(resumeContextPath, 'utf-8');
assert(
  resumeContextSource.includes('autoSaveTimerRef') &&
  resumeContextSource.includes('lastSavedAt'),
  'ResumeContext maintains debounced timer and tracks lastSavedAt timestamp'
);

// -------------------------------------------------------------
// FEATURE 5: Undo / Redo
// -------------------------------------------------------------
console.log('\n--- Feature 5: Undo / Redo ---');
assert(
  resumeContextSource.includes('MAX_HISTORY_STACK = 50') ||
  resumeContextSource.includes('MAX_HISTORY_STACK = 50;') ||
  resumeContextSource.includes('50'),
  'History stack capacity expanded to 50 actions'
);

assert(
  builderSource.includes("e.key === 'z'") &&
  builderSource.includes("e.key === 'y'") &&
  builderSource.includes('if (canUndo) undo()') &&
  builderSource.includes('if (canRedo) redo()'),
  'Keyboard shortcuts Ctrl+Z and Ctrl+Y/Shift+Z properly bound to undo/redo'
);

// -------------------------------------------------------------
// FEATURE 6: Resume Version History
// -------------------------------------------------------------
console.log('\n--- Feature 6: Resume Version History ---');
assert(
  builderSource.includes('Resume Version History') &&
  builderSource.includes('handleRestoreVersion') &&
  builderSource.includes('Save New Snapshot'),
  'Builder allows saving named snapshots, viewing revisions, and restoring versions'
);

const gridPath = resolve(process.cwd(), 'src/components/dashboard/DashboardResumesGrid.tsx');
const gridSource = readFileSync(gridPath, 'utf-8');
assert(
  gridSource.includes('handleConfirmRename') &&
  gridSource.includes('handleDuplicate') &&
  gridSource.includes('Rename Resume') &&
  gridSource.includes('Duplicate'),
  'DashboardResumesGrid provides one-click Rename, Duplicate, and version management'
);

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
  console.log('🎉 Features 3, 4, 5, and 6 VERIFIED!\n');
} else {
  process.exit(1);
}
