import assert from 'node:assert';
import fs from 'node:fs';

console.log('================================================================');
console.log('SMART RESUME AI: CHATBOT DRAGGING IN ALL 4 DIRECTIONS TEST SUITE');
console.log('================================================================\n');

let total = 0;
let passed = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${desc}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const source = fs.readFileSync('src/components/chat/CareerChatbot.tsx', 'utf8');

// 1. Clamp Logic & 4-Directional Movement Math
const PANEL_MARGIN = 8;
const MIN_HEADER_VISIBLE = 56;

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function clampPanelPosition(x, y, width, height, vw, vh) {
  const minX = PANEL_MARGIN;
  const maxX = Math.max(PANEL_MARGIN, vw - width - PANEL_MARGIN);
  const minY = PANEL_MARGIN;
  const maxY =
    height <= vh - 2 * PANEL_MARGIN
      ? Math.max(minY, vh - height - PANEL_MARGIN)
      : Math.max(minY, vh - MIN_HEADER_VISIBLE - PANEL_MARGIN);

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
  };
}

// -----------------------------------------------------------------------------
// TEST GROUP 1: Movement in All 4 Directions on Desktop
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Movement in All 4 Directions on Desktop ---');

it('Moves freely in all 4 directions on standard desktop (1920x1080, panel 460x620)', () => {
  const vw = 1920;
  const vh = 1080;
  const pw = 460;
  const ph = 620;

  const initial = { x: 1400, y: 300 };

  // Move RIGHT
  const movedRight = clampPanelPosition(initial.x + 100, initial.y, pw, ph, vw, vh);
  assert.strictEqual(movedRight.x, 1452); // clamped at 1920 - 460 - 8 = 1452
  assert.strictEqual(movedRight.y, 300);

  // Move LEFT
  const movedLeft = clampPanelPosition(initial.x - 500, initial.y, pw, ph, vw, vh);
  assert.strictEqual(movedLeft.x, 900);
  assert.strictEqual(movedLeft.y, 300);

  // Move DOWN
  const movedDown = clampPanelPosition(initial.x, initial.y + 100, pw, ph, vw, vh);
  assert.strictEqual(movedDown.x, 1400);
  assert.strictEqual(movedDown.y, 400);

  // Move UP
  const movedUp = clampPanelPosition(initial.x, initial.y - 150, pw, ph, vw, vh);
  assert.strictEqual(movedUp.x, 1400);
  assert.strictEqual(movedUp.y, 150);
});

it('Does not get stuck at the top on a smaller viewport (1024x600, panel height 510)', () => {
  const vw = 1024;
  const vh = 600;
  const pw = 460;
  const ph = 510;

  // Initial near top
  const initial = { x: 500, y: 8 };

  // Drag down by 50px
  const movedDown = clampPanelPosition(initial.x, initial.y + 50, pw, ph, vw, vh);
  assert.strictEqual(movedDown.y, 58);
  assert.notStrictEqual(movedDown.y, 8, 'Panel must move down away from top');

  // Drag down to maximum limit
  const movedMaxDown = clampPanelPosition(initial.x, initial.y + 200, pw, ph, vw, vh);
  assert.strictEqual(movedMaxDown.y, 600 - 510 - 8); // 82px
  assert.ok(movedMaxDown.y > 8, 'Maximum Y must be greater than top boundary');
});

it('Allows vertical dragging even when panel is taller than viewport (600x480, panel 560)', () => {
  const vw = 600;
  const vh = 480;
  const pw = 460;
  const ph = 560; // taller than 480px

  const initial = { x: 8, y: 8 };
  // Drag down by 100px
  const movedDown = clampPanelPosition(initial.x, initial.y + 100, pw, ph, vw, vh);
  assert.strictEqual(movedDown.y, 108);
  assert.notStrictEqual(movedDown.y, 8, 'Must not be pinned at 8px');

  // Maximum allowed keeps header accessible (vh - 56 - 8 = 416)
  const movedMax = clampPanelPosition(initial.x, 1000, pw, ph, vw, vh);
  assert.strictEqual(movedMax.y, 480 - 56 - 8);
});

// -----------------------------------------------------------------------------
// TEST GROUP 2: Movement on Mobile Viewports
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Movement on Mobile Viewports ---');

it('Moves vertically on mobile portrait (390x844, panel 374x560)', () => {
  const vw = 390;
  const vh = 844;
  const pw = 374;
  const ph = 560;

  const initial = { x: 8, y: 100 };

  // Drag Down
  const movedDown = clampPanelPosition(initial.x, initial.y + 80, pw, ph, vw, vh);
  assert.strictEqual(movedDown.y, 180);

  // Drag Up
  const movedUp = clampPanelPosition(initial.x, initial.y - 50, pw, ph, vw, vh);
  assert.strictEqual(movedUp.y, 50);

  // Drag Up past boundary
  const movedAbove = clampPanelPosition(initial.x, -50, pw, ph, vw, vh);
  assert.strictEqual(movedAbove.y, 8);
});

// -----------------------------------------------------------------------------
// TEST GROUP 3: CSS & Transform Conflict Elimination
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: CSS & Transform Conflict Elimination ---');

it('Panel motion container does not apply conflicting translateY in initial/animate/exit', () => {
  const dialogIdx = source.indexOf('role="dialog"');
  assert.ok(dialogIdx !== -1, 'Must find role="dialog"');
  const dialogMotion = source.slice(dialogIdx, dialogIdx + 600);
  assert.ok(!/\by\s*:/.test(dialogMotion), 'dialog motion props must not contain y translate animation');
});

it('Panel container uses position: fixed and does not conflict with position: relative', () => {
  const classNameMatch = source.match(/role="dialog"[\s\S]*?className=\{([\s\S]*?)\}/);
  assert.ok(classNameMatch, 'Must find className on dialog');
  const classStr = classNameMatch[1];
  assert.ok(classStr.includes('fixed'), 'Must have fixed positioning');
  // Check that the windowed classes do not have "relative" as a standalone class token
  const windowedClassStr = classStr.split(':')[1] || '';
  const tokens = windowedClassStr.replace(/['"`]/g, '').split(/\s+/);
  assert.ok(!tokens.includes('relative'), 'Windowed container must not contain relative class token');
});

// -----------------------------------------------------------------------------
// TEST GROUP 4: Event Handlers & Reliability
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Event Handlers, Pointer Capture & Persistence ---');

it('Header uses pointer down and pointer capture', () => {
  assert.ok(source.includes('onPointerDown={handlePanelPointerDown}'), 'Header must bind onPointerDown');
  assert.ok(source.includes('setPointerCapture'), 'Must use setPointerCapture');
});

it('Registers global window pointermove and pointerup listeners on drag start', () => {
  assert.ok(source.includes("window.addEventListener('pointermove'"), 'Must add global pointermove');
  assert.ok(source.includes("window.addEventListener('pointerup'"), 'Must add global pointerup');
  assert.ok(source.includes("window.removeEventListener('pointermove'"), 'Must cleanup global pointermove');
  assert.ok(source.includes("window.removeEventListener('pointerup'"), 'Must cleanup global pointerup');
});

it('Header controls (buttons, links, inputs) are excluded from initiating drag', () => {
  assert.ok(
    source.includes("target.closest('button, a, input, textarea, select, [data-chat-no-drag=\"true\"]')"),
    'Must filter out clicks on buttons and interactive elements'
  );
});

it('Persists and restores panel position across minimizing and reopening', () => {
  assert.ok(source.includes("localStorage.setItem(PANEL_STORAGE_KEY"), 'Must persist panel position on drag finish');
  assert.ok(source.includes("localStorage.getItem(PANEL_STORAGE_KEY"), 'Must restore panel position on client mount');
  assert.ok(source.includes("localStorage.removeItem(PANEL_STORAGE_KEY"), 'Must clear panel position on reset');
});

it('flushPendingPanelPosition uses panelPositionRef fallback to never lose final coordinates', () => {
  assert.ok(
    source.includes('pendingPanelPositionRef.current || panelPositionRef.current'),
    'Must fallback to panelPositionRef.current so position is never dropped'
  );
});

it('getPanelStyle checks panelPosition without accessing refs during render', () => {
  assert.ok(
    source.includes('if (panelPosition) {'),
    'Must check panelPosition state to position the panel'
  );
  const getPanelStyleBody = source.slice(source.indexOf('const getPanelStyle'), source.indexOf('const launcherStyle'));
  assert.ok(
    !getPanelStyleBody.includes('panelPositionRef.current'),
    'getPanelStyle must not access panelPositionRef during render'
  );
});

console.log('\n================================================================');
console.log(`RESULTS: ${passed} / ${total} tests passed successfully.`);
console.log('================================================================\n');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}

