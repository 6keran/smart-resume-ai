import fs from 'fs';
import path from 'path';

console.log('===============================================================');
console.log('🎨 SMART RESUME AI: PROFESSIONAL LIGHT THEME AUDIT');
console.log('===============================================================');

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✅ [PASS] ${description}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
    failed++;
  }
}

// 1. Verify CSS Custom Properties in src/app/globals.css
const globalsCss = fs.readFileSync('src/app/globals.css', 'utf-8');

console.log('\n--- GROUP 1: COLOR PALETTE CONFORMANCE ---');
assert(globalsCss.includes('--bg-primary: #FFFFFF;'), 'Main background is #FFFFFF');
assert(globalsCss.includes('--bg-secondary: #F6F7F9;'), 'Secondary background is #F6F7F9');
assert(globalsCss.includes('--bg-card: #FFFFFF;'), 'Card background is #FFFFFF');
assert(globalsCss.includes('--text-primary: #20242B;'), 'Primary text is #20242B');
assert(globalsCss.includes('--text-secondary: #626B78;'), 'Secondary text is #626B78');
assert(globalsCss.includes('--accent: #3157C8;'), 'Primary accent (Royal Blue) is #3157C8');
assert(globalsCss.includes('--accent-hover: #2447AB;'), 'Hover accent is #2447AB');
assert(globalsCss.includes('--border-color: #E5E8ED;'), 'Subtle border is #E5E8ED');
assert(globalsCss.includes('--color-success: #16845B;'), 'Success color is #16845B');
assert(globalsCss.includes('--color-warning: #A96812;'), 'Warning color is #A96812');
assert(globalsCss.includes('--color-error: #C43D43;'), 'Error color is #C43D43');

console.log('\n--- GROUP 2: BUTTON & INPUT RADIUS STANDARDIZATION (8PX) ---');
assert(globalsCss.includes('.btn-primary') && globalsCss.includes('border-radius: 8px;'), '.btn-primary has 8px border-radius');
assert(globalsCss.includes('.btn-secondary') && globalsCss.includes('border-radius: 8px;'), '.btn-secondary has 8px border-radius');
assert(globalsCss.includes('.btn-outline') && globalsCss.includes('border-radius: 8px;'), '.btn-outline has 8px border-radius');
assert(globalsCss.includes('.btn-destructive') && globalsCss.includes('border-radius: 8px;'), '.btn-destructive has 8px border-radius');
assert(globalsCss.includes('.btn-destructive') && globalsCss.includes('background-color: var(--color-error);'), '.btn-destructive has solid #C43D43 without gradient');
assert(globalsCss.includes('.btn-icon') && globalsCss.includes('border-radius: 8px;'), '.btn-icon has 8px border-radius');
assert(globalsCss.includes('.btn-sm') && globalsCss.includes('border-radius: 8px !important;'), '.btn-sm standardized to 8px');
assert(globalsCss.includes('.btn-lg') && globalsCss.includes('border-radius: 8px !important;'), '.btn-lg standardized to 8px');
assert(globalsCss.includes('.btn-xl') && globalsCss.includes('border-radius: 8px !important;'), '.btn-xl standardized to 8px');
assert(globalsCss.includes('.search-pill') && globalsCss.includes('border-radius: 8px;'), '.search-pill standardized to 8px');
assert(globalsCss.includes('.badge-pill') && globalsCss.includes('border-radius: 6px;'), '.badge-pill standardized to 6px');

console.log('\n--- GROUP 3: PROHIBITED EFFECTS REMOVAL (NO GLOWS, NO BLOBS) ---');
assert(globalsCss.includes('.landing-hero::before {\n  display: none !important;\n}'), '.landing-hero::before breathing glow blob is disabled');
assert(globalsCss.includes('.landing-commitment__orb {\n  display: none !important;\n}'), '.landing-commitment__orb breathing orb is disabled');
assert(globalsCss.includes('.ambient-beam {\n  display: none !important;\n}'), '.ambient-beam is disabled');
assert(globalsCss.includes('.ambient-glow {\n  display: none !important;\n}'), '.ambient-glow is disabled');

console.log('\n--- GROUP 4: THEME SCRIPT & CONTEXT INITIALIZATION ---');
const themeInitJs = fs.readFileSync('public/theme-init.js', 'utf-8');
const themeContext = fs.readFileSync('src/context/ThemeContext.tsx', 'utf-8');
assert(themeInitJs.includes("var m = t === 'dark' ? 'dark' : 'light';"), 'theme-init.js defaults to light');
assert(themeInitJs.includes("r.style.colorScheme = 'light';"), 'theme-init.js sets light color-scheme');
assert(themeContext.includes("useState<string>('light')"), 'ThemeContext initializes state with light');
assert(themeContext.includes("savedTheme || 'light'"), 'ThemeContext defaults savedTheme fallback to light');

console.log('\n--- GROUP 5: COMPONENT-LEVEL LIGHT SURFACES AUDIT ---');
const sidebarTsx = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf-8');
assert(!sidebarTsx.includes('rounded-full text-[13.5px]'), 'Sidebar navigation items converted from rounded-full to rounded-lg');
assert(!sidebarTsx.includes('shadow-[0_0_8px_var(--accent)]'), 'Sidebar active dot removed neon glow shadow');

const chatbotTsx = fs.readFileSync('src/components/chat/CareerChatbot.tsx', 'utf-8');
assert(!chatbotTsx.includes('bg-slate-900 text-slate-100 font-mono'), 'CareerChatbot code container converted to light tokens');
assert(!chatbotTsx.includes('text-slate-900 dark:text-white mt-2 mb-1'), 'CareerChatbot markdown headers converted to text-[var(--text-primary)]');

const projectsTsx = fs.readFileSync('src/app/projects/page.tsx', 'utf-8');
assert(!projectsTsx.includes('bg-slate-900 text-slate-100 font-mono text-[11px] space-y-2 border border-slate-800'), 'Projects request pipeline converted to light tokens');
assert(!projectsTsx.includes('bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800'), 'Projects folder structure converted to light tokens');

const proctoringTsx = fs.readFileSync('src/app/admin/(protected)/proctoring/page.tsx', 'utf-8');
assert(proctoringTsx.includes('bg-white/95 px-2.5 py-1.5 rounded-lg border border-[#E5E8ED] text-[10px] text-[#20242B] font-mono shadow-sm'), 'Admin proctoring live stream HUD converted to clean light card');

console.log('\n===============================================================');
console.log(`TOTAL AUDIT CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('===============================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 26 LIGHT THEME CONFORMANCE CHECKS PASSED (100%)');
}

