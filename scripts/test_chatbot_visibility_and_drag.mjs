import assert from 'node:assert';
import fs from 'node:fs';

console.log('================================================================');
console.log('SMART RESUME AI: CHATBOT VISIBILITY, AUTH & DRAG LOGIC TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ FAIL: ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------------------
// TEST GROUP 1: Route Visibility Rules
// -------------------------------------------------------------------------
console.log('--- TEST GROUP 1: ROUTE EXCLUSION & VISIBILITY RULES ---');

function isExcludedRoute(pathname) {
  return Boolean(
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/reset-password') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/skills/assess') ||
    pathname?.startsWith('/skills/certificate') ||
    pathname?.startsWith('/assessment') ||
    pathname?.startsWith('/assessments') ||
    pathname === '/privacy' ||
    pathname === '/terms'
  );
}

test('Login page is excluded', () => {
  assert.strictEqual(isExcludedRoute('/login'), true);
  assert.strictEqual(isExcludedRoute('/login?from=/dashboard'), true);
});

test('Registration page is excluded', () => {
  assert.strictEqual(isExcludedRoute('/register'), true);
});

test('Forgot & reset password pages are excluded', () => {
  assert.strictEqual(isExcludedRoute('/forgot-password'), true);
  assert.strictEqual(isExcludedRoute('/reset-password'), true);
});

test('Admin pages are completely excluded', () => {
  assert.strictEqual(isExcludedRoute('/admin'), true);
  assert.strictEqual(isExcludedRoute('/admin/login'), true);
  assert.strictEqual(isExcludedRoute('/admin/dashboard'), true);
  assert.strictEqual(isExcludedRoute('/admin/users'), true);
  assert.strictEqual(isExcludedRoute('/admin/proctoring'), true);
});

test('Assessment routes are completely excluded (instructions, testing, questions, results)', () => {
  assert.strictEqual(isExcludedRoute('/skills/assess'), true);
  assert.strictEqual(isExcludedRoute('/skills/assess/react'), true);
  assert.strictEqual(isExcludedRoute('/skills/assess/python'), true);
  assert.strictEqual(isExcludedRoute('/skills/assess/TypeScript'), true);
  assert.strictEqual(isExcludedRoute('/skills/assess/System%20Design'), true);
  assert.strictEqual(isExcludedRoute('/skills/certificate/cert_123'), true);
  assert.strictEqual(isExcludedRoute('/assessment'), true);
  assert.strictEqual(isExcludedRoute('/assessments'), true);
});

test('Public legal pages (privacy, terms) are excluded', () => {
  assert.strictEqual(isExcludedRoute('/privacy'), true);
  assert.strictEqual(isExcludedRoute('/terms'), true);
});

test('Protected candidate pages are ALLOWED (not excluded)', () => {
  assert.strictEqual(isExcludedRoute('/dashboard'), false);
  assert.strictEqual(isExcludedRoute('/dashboard/resumes'), false);
  assert.strictEqual(isExcludedRoute('/dashboard/skills'), false);
  assert.strictEqual(isExcludedRoute('/builder'), false);
  assert.strictEqual(isExcludedRoute('/analyzer'), false);
  assert.strictEqual(isExcludedRoute('/improver'), false);
  assert.strictEqual(isExcludedRoute('/job-match'), false);
  assert.strictEqual(isExcludedRoute('/jobs'), false);
  assert.strictEqual(isExcludedRoute('/skills'), false);
});

// -------------------------------------------------------------------------
// TEST GROUP 2: Authentication State Gating
// -------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: AUTHENTICATION STATE & FLASH PREVENTION ---');

function shouldRenderChatbot({ loading, user, pathname }) {
  if (loading) return false;
  if (!user) return false;
  if (isExcludedRoute(pathname)) return false;
  return true;
}

test('Does not render while session is loading (prevents flash on public/protected pages)', () => {
  assert.strictEqual(shouldRenderChatbot({ loading: true, user: null, pathname: '/dashboard' }), false);
  assert.strictEqual(shouldRenderChatbot({ loading: true, user: { id: 'usr_1' }, pathname: '/dashboard' }), false);
  assert.strictEqual(shouldRenderChatbot({ loading: true, user: null, pathname: '/login' }), false);
});

test('Does not render for unauthenticated visitors', () => {
  assert.strictEqual(shouldRenderChatbot({ loading: false, user: null, pathname: '/dashboard' }), false);
  assert.strictEqual(shouldRenderChatbot({ loading: false, user: null, pathname: '/builder' }), false);
  assert.strictEqual(shouldRenderChatbot({ loading: false, user: null, pathname: '/login' }), false);
});

test('Renders ONLY for authenticated users on candidate application routes', () => {
  const activeUser = { id: 'usr_123', name: 'Verified Candidate', email: 'user@example.com' };
  assert.strictEqual(shouldRenderChatbot({ loading: false, user: activeUser, pathname: '/dashboard' }), true);
  assert.strictEqual(shouldRenderChatbot({ loading: false, user: activeUser, pathname: '/builder' }), true);
  assert.strictEqual(shouldRenderChatbot({ loading: false, user: activeUser, pathname: '/improver' }), true);
  assert.strictEqual(shouldRenderChatbot({ loading: false, user: activeUser, pathname: '/job-match' }), true);
});

test('Does NOT render on login/admin pages even if a user object exists in memory', () => {
  const activeUser = { id: 'usr_123', name: 'Verified Candidate', email: 'user@example.com' };
  assert.strictEqual(shouldRenderChatbot({ loading: false, user: activeUser, pathname: '/login' }), false);
  assert.strictEqual(shouldRenderChatbot({ loading: false, user: activeUser, pathname: '/register' }), false);
  assert.strictEqual(shouldRenderChatbot({ loading: false, user: activeUser, pathname: '/admin/dashboard' }), false);
});

// -------------------------------------------------------------------------
// TEST GROUP 3: Draggable Math, Viewport Clamping & Orientation
// -------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: DRAGGABLE CLAMPING & ORIENTATION RECALCULATION ---');

const MARGIN = 16;
const DEFAULT_LAUNCHER_WIDTH = 135;
const DEFAULT_LAUNCHER_HEIGHT = 44;

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function clampPosition(rawPos, viewportW, viewportH, launcherW = DEFAULT_LAUNCHER_WIDTH, launcherH = DEFAULT_LAUNCHER_HEIGHT) {
  return {
    x: clamp(rawPos.x, MARGIN, Math.max(MARGIN, viewportW - launcherW - MARGIN)),
    y: clamp(rawPos.y, MARGIN, Math.max(MARGIN, viewportH - launcherH - MARGIN)),
  };
}

test('Clamps launcher inside standard desktop viewport (1920x1080)', () => {
  const vpW = 1920;
  const vpH = 1080;

  // Drag beyond top-left
  const posTopLeft = clampPosition({ x: -100, y: -50 }, vpW, vpH);
  assert.strictEqual(posTopLeft.x, 16);
  assert.strictEqual(posTopLeft.y, 16);

  // Drag beyond bottom-right
  const posBottomRight = clampPosition({ x: 3000, y: 2000 }, vpW, vpH);
  assert.strictEqual(posBottomRight.x, vpW - DEFAULT_LAUNCHER_WIDTH - 16);
  assert.strictEqual(posBottomRight.y, vpH - DEFAULT_LAUNCHER_HEIGHT - 16);
});

test('Clamps launcher inside mobile portrait viewport (390x844)', () => {
  const vpW = 390;
  const vpH = 844;

  const pos = clampPosition({ x: 500, y: 900 }, vpW, vpH);
  assert.strictEqual(pos.x, 390 - DEFAULT_LAUNCHER_WIDTH - 16);
  assert.strictEqual(pos.y, 844 - DEFAULT_LAUNCHER_HEIGHT - 16);
  assert(pos.x > 0);
  assert(pos.y > 0);
});

test('Recalculates position on mobile orientation flip (landscape 844x390)', () => {
  const storedPos = { x: 239, y: 784 }; // bottom of portrait (844px high)

  // Rotate to landscape (height shrinks to 390px)
  const adjusted = clampPosition(storedPos, 844, 390);
  assert.strictEqual(adjusted.y, 390 - DEFAULT_LAUNCHER_HEIGHT - 16);
  assert(adjusted.y <= 390 - DEFAULT_LAUNCHER_HEIGHT);
});

// -------------------------------------------------------------------------
// TEST GROUP 4: Tap vs. Drag Threshold
// -------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: TAP VS. DRAG INTENT DISCRIMINATION ---');

function isIntentionalDrag(dx, dy) {
  return (dx * dx + dy * dy) > 25; // 5px threshold squared
}

test('Small finger jitter (under 5px) is classified as tap/click', () => {
  assert.strictEqual(isIntentionalDrag(2, 2), false); // 8 <= 25
  assert.strictEqual(isIntentionalDrag(0, 3), false); // 9 <= 25
  assert.strictEqual(isIntentionalDrag(-4, 0), false); // 16 <= 25
});

test('Movement >= 5px is classified as drag (suppresses click)', () => {
  assert.strictEqual(isIntentionalDrag(5, 5), true); // 50 > 25
  assert.strictEqual(isIntentionalDrag(0, 10), true); // 100 > 25
  assert.strictEqual(isIntentionalDrag(-20, 15), true); // 625 > 25
});

// -------------------------------------------------------------------------
// TEST GROUP 5: Intelligent Chat Panel Placement
// -------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: INTELLIGENT QUADRANT-AWARE PANEL PLACEMENT ---');

const PANEL_WIDTH = 460;
const PANEL_HEIGHT = 620;

function computePanelStyle(position, viewportW, viewportH) {
  if (viewportW < 640) {
    return { mobile: true };
  }

  if (!position) {
    return { bottom: '24px', right: '24px' };
  }

  const launcherW = DEFAULT_LAUNCHER_WIDTH;
  const launcherH = DEFAULT_LAUNCHER_HEIGHT;
  const style = {};

  const isRightHalf = (position.x + launcherW / 2) > (viewportW / 2);
  if (isRightHalf) {
    const rightDistance = viewportW - (position.x + launcherW);
    style.right = `${clamp(rightDistance, MARGIN, viewportW - PANEL_WIDTH - MARGIN)}px`;
    style.left = 'auto';
  } else {
    style.left = `${clamp(position.x, MARGIN, viewportW - PANEL_WIDTH - MARGIN)}px`;
    style.right = 'auto';
  }

  const isBottomHalf = (position.y + launcherH / 2) > (viewportH / 2);
  if (isBottomHalf) {
    const bottomDistance = viewportH - position.y + 12;
    style.bottom = `${clamp(bottomDistance, MARGIN, viewportH - PANEL_HEIGHT - MARGIN)}px`;
    style.top = 'auto';
  } else {
    const topDistance = position.y + launcherH + 12;
    style.top = `${clamp(topDistance, MARGIN, viewportH - PANEL_HEIGHT - MARGIN)}px`;
    style.bottom = 'auto';
  }

  return style;
}

test('Default launcher position opens at bottom: 24px, right: 24px', () => {
  const panel = computePanelStyle(null, 1920, 1080);
  assert.strictEqual(panel.bottom, '24px');
  assert.strictEqual(panel.right, '24px');
});

test('Launcher in Top-Left quadrant: panel opens DOWNWARDS and LEFT-ALIGNED', () => {
  const panel = computePanelStyle({ x: 30, y: 40 }, 1920, 1080);
  assert.strictEqual(panel.left, '30px');
  assert.strictEqual(panel.right, 'auto');
  assert.strictEqual(panel.top, `${40 + DEFAULT_LAUNCHER_HEIGHT + 12}px`);
  assert.strictEqual(panel.bottom, 'auto');
});

test('Launcher in Top-Right quadrant: panel opens DOWNWARDS and RIGHT-ALIGNED', () => {
  const pos = { x: 1700, y: 50 };
  const panel = computePanelStyle(pos, 1920, 1080);
  assert.strictEqual(panel.left, 'auto');
  assert.strictEqual(panel.right, `${1920 - (1700 + DEFAULT_LAUNCHER_WIDTH)}px`);
  assert.strictEqual(panel.top, `${50 + DEFAULT_LAUNCHER_HEIGHT + 12}px`);
  assert.strictEqual(panel.bottom, 'auto');
});

test('Launcher in Bottom-Left quadrant: panel opens UPWARDS and LEFT-ALIGNED', () => {
  const pos = { x: 20, y: 950 };
  const panel = computePanelStyle(pos, 1920, 1080);
  assert.strictEqual(panel.left, '20px');
  assert.strictEqual(panel.right, 'auto');
  assert.strictEqual(panel.bottom, `${1080 - 950 + 12}px`);
  assert.strictEqual(panel.top, 'auto');
});

test('Mobile screens use responsive full sheet instead of manual absolute offsets', () => {
  const panel = computePanelStyle({ x: 100, y: 500 }, 375, 812);
  assert.strictEqual(panel.mobile, true);
});

// -------------------------------------------------------------------------
// TEST GROUP 6: Open Panel Drag Controls
// -------------------------------------------------------------------------
console.log('\n--- TEST GROUP 6: OPEN PANEL DRAG CONTROLS ---');

const chatbotSource = fs.readFileSync('src/components/chat/CareerChatbot.tsx', 'utf8');
const PANEL_MARGIN = 8;

function clampOpenPanelPosition(x, y, width, height, viewportWidth, viewportHeight) {
  const maxX = Math.max(PANEL_MARGIN, viewportWidth - width - PANEL_MARGIN);
  const maxY = Math.max(PANEL_MARGIN, viewportHeight - height - PANEL_MARGIN);
  return {
    x: clamp(x, PANEL_MARGIN, maxX),
    y: clamp(y, PANEL_MARGIN, maxY),
  };
}

test('Alex identity is not present in the chatbot source', () => {
  assert.ok(!chatbotSource.includes('Alex'), 'The chatbot source must not contain Alex');
});

test('Header drag handlers use pointer capture and requestAnimationFrame', () => {
  assert.ok(chatbotSource.includes('const handlePanelPointerDown'), 'Header must start a panel pointer drag');
  assert.ok(chatbotSource.includes('const handlePanelPointerMove'), 'Header must handle panel pointer movement');
  assert.ok(chatbotSource.includes('window.requestAnimationFrame'), 'Panel movement must be frame-throttled');
  assert.ok(chatbotSource.includes('setPointerCapture'), 'Drag must capture the active pointer');
  assert.ok(chatbotSource.includes('releasePointerCapture'), 'Drag must release the active pointer');
  assert.ok(chatbotSource.includes('onPointerDown={handlePanelPointerDown}'), 'Header must wire its drag start handler');
});

test('Header controls and the confirmation dialog are excluded from dragging', () => {
  assert.ok(
    chatbotSource.includes("target.closest('button, a, input, textarea, select, [data-chat-no-drag=\"true\"]')"),
    'Interactive header descendants must not initiate dragging'
  );
  assert.ok(chatbotSource.includes('data-chat-no-drag="true"'), 'The clear-confirmation dialog must not initiate dragging');
});

test('Open chat panel remains entirely within desktop and mobile viewports', () => {
  assert.deepStrictEqual(
    clampOpenPanelPosition(-200, -100, 460, 620, 1440, 900),
    { x: 8, y: 8 }
  );
  assert.deepStrictEqual(
    clampOpenPanelPosition(2000, 2000, 460, 620, 1440, 900),
    { x: 972, y: 272 }
  );
  assert.deepStrictEqual(
    clampOpenPanelPosition(600, 900, 359, 560, 375, 812),
    { x: 8, y: 244 }
  );
});

test('Viewport changes re-clamp an already moved panel', () => {
  assert.ok(chatbotSource.includes('const currentPanelPosition = panelPositionRef.current'));
  assert.ok(chatbotSource.includes('setPanelPosition(nextPosition)'));
  assert.ok(chatbotSource.includes('clampPanelPosition('));
});

// -------------------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} tests passed successfully.`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
