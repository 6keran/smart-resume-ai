import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const manifest = JSON.parse(fs.readFileSync('scripts/_manifest_dump.json', 'utf8'));

console.log('====================================================');
console.log('SMART RESUME AI: EXACT FILE-BY-FILE STAGING RUNNER');
console.log('====================================================');

// 1. Stage Modified Files
console.log(`Staging ${manifest.modified.length} modified files...`);
for (const file of manifest.modified) {
  if (!fs.existsSync(file)) {
    throw new Error(`Modified file not found on disk: ${file}`);
  }
  execFileSync('git', ['add', file], { stdio: 'inherit' });
}
console.log(`✓ All ${manifest.modified.length} modified files staged successfully.`);

// 2. Stage Deleted Files
console.log(`Staging ${manifest.deleted.length} deleted files...`);
for (const file of manifest.deleted) {
  execFileSync('git', ['rm', '--quiet', file], { stdio: 'inherit' });
}
console.log(`✓ All ${manifest.deleted.length} deletions staged successfully.`);

// 3. Stage Added Files
console.log(`Staging ${manifest.additions.length} added files...`);
for (const file of manifest.additions) {
  if (!fs.existsSync(file)) {
    throw new Error(`Addition file not found on disk: ${file}`);
  }
  execFileSync('git', ['add', file], { stdio: 'inherit' });
}
console.log(`✓ All ${manifest.additions.length} additions staged successfully.`);

console.log('====================================================');
console.log('🎉 ALL MANIFEST FILES STAGED WITH ZERO WILDCARDS');
console.log('====================================================');

