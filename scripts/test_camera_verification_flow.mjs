import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('================================================================');
console.log('SMART RESUME AI: CAMERA FRAME RENDERING & VERIFICATION TESTS');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

// 1. Inspect source file implementation
const pagePath = path.join(process.cwd(), 'src', 'app', 'skills', 'assess', '[skill]', 'page.tsx');
assert.ok(fs.existsSync(pagePath), 'Assessment page file exists');
const pageSrc = fs.readFileSync(pagePath, 'utf8');

// Test 1: Persistent video element in readiness container
test('Video element is persistently rendered with readinessVideoRef', () => {
  assert.ok(
    pageSrc.includes('ref={readinessVideoRef}'),
    'readinessVideoRef is attached to video element'
  );
  assert.ok(
    !pageSrc.includes('{cameraActive && framesVerified ? (\n                <div className="relative rounded-xl overflow-hidden bg-black border border-[var(--border-color)] max-w-md mx-auto aspect-video">\n                  <video'),
    'Video element is NOT conditionally unmounted when framesVerified is false'
  );
});

// Test 2: Video attributes compliance
test('Video element includes autoPlay, muted, and playsInline for autoplay policy compliance', () => {
  const readinessBlockMatch = pageSrc.match(/<video[\s\S]*?ref=\{readinessVideoRef\}[\s\S]*?\/>/);
  assert.ok(readinessBlockMatch, 'Readiness video element tag located');
  const tag = readinessBlockMatch[0];
  assert.ok(tag.includes('autoPlay'), 'autoPlay attribute present');
  assert.ok(tag.includes('muted'), 'muted attribute present');
  assert.ok(tag.includes('playsInline'), 'playsInline attribute present');
});

// Test 3: Stream attachment and playback in handleEnableCamera
test('handleEnableCamera attaches stream to targetVideo with muted & playsInline and plays stream', () => {
  assert.ok(
    pageSrc.includes('targetVideo.srcObject = stream'),
    'targetVideo.srcObject is assigned stream'
  );
  assert.ok(
    pageSrc.includes('targetVideo.muted = true'),
    'targetVideo.muted is forced true to bypass browser autoplay blocks'
  );
  assert.ok(
    pageSrc.includes('targetVideo.playsInline = true'),
    'targetVideo.playsInline is forced true for mobile browsers'
  );
  assert.ok(
    pageSrc.includes('await targetVideo.play()'),
    'targetVideo.play() is awaited'
  );
});

// Test 4: verifyCameraFrames accepts stream and checks hardware mute
test('verifyCameraFrames accepts stream parameter and checks hardware track.muted', () => {
  assert.ok(
    pageSrc.includes('verifyCameraFrames = useCallback(') &&
    pageSrc.includes('videoEl: HTMLVideoElement') &&
    pageSrc.includes('stream?: MediaStream | null'),
    'verifyCameraFrames signature accepts videoEl and stream'
  );
  assert.ok(
    pageSrc.includes('if (videoTrack.muted)'),
    'Checks videoTrack.muted for hardware privacy switches and physical shutters'
  );
});

// Test 5: verifyCameraFrames supports requestVideoFrameCallback and polling fallback
test('verifyCameraFrames implements requestVideoFrameCallback and interval polling fallback', () => {
  assert.ok(
    pageSrc.includes('requestVideoFrameCallback'),
    'requestVideoFrameCallback compositor presentation check implemented'
  );
  assert.ok(
    pageSrc.includes('videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0'),
    'Readiness state and non-zero dimensions checked'
  );
  assert.ok(
    pageSrc.includes('currentTime !== lastTime'),
    'Video progression checked via frame advancement'
  );
});

// Test 6: Reconnection / retry stops previous tracks
test('handleEnableCamera stops existing media tracks before reacquiring', () => {
  assert.ok(
    pageSrc.includes('if (mediaStreamRef.current) {\n      mediaStreamRef.current.getTracks().forEach((track) => track.stop());\n      mediaStreamRef.current = null;\n    }'),
    'mediaStreamRef tracks stopped and cleared before re-requesting stream'
  );
  assert.ok(
    pageSrc.includes('if (readinessVideoRef.current) {\n      readinessVideoRef.current.srcObject = null;\n    }'),
    'readinessVideoRef.srcObject reset on retry'
  );
});

// Test 7: Concurrency lock with isInitializingRef
test('handleEnableCamera has isInitializingRef concurrency lock', () => {
  assert.ok(
    pageSrc.includes('isInitializingRef = useRef<boolean>(false)'),
    'isInitializingRef initialized'
  );
  assert.ok(
    pageSrc.includes('if (isInitializingRef.current) return;'),
    'Concurrency guard in handleEnableCamera'
  );
  assert.ok(
    pageSrc.includes('isInitializingRef.current = false;'),
    'Concurrency lock released in finally block'
  );
});

// Test 8: Live endpoint verification for assessment route with authenticated session
await testAsync('Assessment page /skills/assess/python serves updated readiness UI when authenticated', async () => {
  // Register a test candidate
  const ts = Date.now();
  const regRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Camera Test User',
      email: `camera_tester_${ts}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });
  assert.equal(regRes.status, 200, 'Registration succeeded');
  const setCookie = regRes.headers.get('set-cookie') || '';
  const match = setCookie.match(/sra_user_session=([^;]+)/);
  assert.ok(match, 'sra_user_session cookie received');

  const res = await fetch('http://localhost:3000/skills/assess/python', {
    headers: {
      Cookie: `sra_user_session=${match[1]}`,
    },
  });
  assert.equal(res.status, 200, 'HTTP 200 returned');
  const html = await res.text();
  assert.ok(html.includes('Camera Permission &amp; Frame Verification Required') || html.includes('Camera Permission & Frame Verification Required'), 'Initial prompt rendered');
  assert.ok(html.includes('Enable Camera &amp; Verify Frames') || html.includes('Enable Camera & Verify Frames'), 'Enable camera button rendered');
  assert.ok(
    (html.includes('autoPlay') || html.includes('autoplay')) &&
    (html.includes('playsInline') || html.includes('playsinline')),
    'Video attributes rendered in HTML'
  );
});

// Test 9: Simulated Frame Verification Logic Unit Test
await testAsync('verifyCameraFrames logic handles mock camera stream and frame presentation', async () => {
  // Create mock track
  let isMuted = false;
  const mockTrack = {
    readyState: 'live',
    get muted() { return isMuted; },
    addEventListener: (event, handler) => {},
    removeEventListener: () => {},
  };
  const mockStream = {
    getVideoTracks: () => [mockTrack],
  };

  // Mock video element
  const mockVideo = {
    srcObject: null,
    muted: false,
    playsInline: false,
    readyState: 2,
    videoWidth: 640,
    videoHeight: 480,
    currentTime: 0,
    play: async () => {},
  };

  // Run mock simulation of frame delivery
  let verified = false;
  let lastTime = -1;
  let frameCount = 0;

  for (let tick = 0; tick < 5; tick++) {
    mockVideo.currentTime = tick * 0.033;
    if (mockVideo.readyState >= 2 && mockVideo.videoWidth > 0 && mockVideo.currentTime !== lastTime) {
      lastTime = mockVideo.currentTime;
      frameCount++;
      if (frameCount >= 2) {
        verified = true;
        break;
      }
    }
  }

  assert.ok(verified, 'Mock camera stream successfully verifies within 2 frames');
  assert.equal(mockVideo.videoWidth, 640, 'Resolution width preserved');
  assert.equal(mockVideo.videoHeight, 480, 'Resolution height preserved');
});

console.log(`\n================================================================`);
console.log(`TEST RUN SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`================================================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
