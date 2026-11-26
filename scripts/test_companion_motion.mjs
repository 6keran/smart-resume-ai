import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/components/assistant/companionMotion.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { REST_POSE, MOTION_DURATION, sampleCompanionPose, staticCompanionPose, sampleWalkingPose } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const locomotion = await readFile(new URL('../src/components/assistant/companionLocomotion.ts', import.meta.url), 'utf8');
const locomotionCode = ts.transpileModule(locomotion, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { createCompanionDrag, advanceCompanionDrag, followCompanionPosition, MAX_GAIT_CADENCE } = await import(`data:text/javascript;base64,${Buffer.from(locomotionCode).toString('base64')}`);
let checks = 0;
for (const [motion, duration] of Object.entries(MOTION_DURATION)) {
  for (let time = 0; time <= duration * 2; time += 16) {
    const pose = sampleCompanionPose(motion, time, time / 10);
    for (const value of Object.values(pose)) assert.ok(Number.isFinite(value), `${motion} has an invalid joint`);
    assert.ok(pose.eyes >= .04 && pose.eyes <= 1);
    assert.ok(Math.abs(pose.bodyY) <= 8);
  }
  checks++;
}
const restWalk = sampleCompanionPose('walking', 0, 0);
const advancedWalk = sampleCompanionPose('walking', 0, .5);
assert.notEqual(restWalk.leftHip, advancedWalk.leftHip);
assert.notEqual(restWalk.leftArm, advancedWalk.leftArm);
assert.deepEqual(restWalk, sampleCompanionPose('walking', 0, 1));
checks++;
for (const motion of ['greeting', 'answering', 'success', 'error', 'settling']) {
  const finished = sampleCompanionPose(motion, MOTION_DURATION[motion] + 1);
  for (const key of Object.keys(REST_POSE).filter((key) => key !== 'breath' && key !== 'eyes')) assert.equal(finished[key], REST_POSE[key], `${motion} must settle`);
  checks++;
}
const hovered = sampleCompanionPose('hover', 250);
const repeatedHover = sampleCompanionPose('hover', 250 + MOTION_DURATION.hover);
for (const key of Object.keys(REST_POSE).filter((key) => key !== 'breath' && key !== 'eyes')) assert.equal(hovered[key], repeatedHover[key], 'Pointer hover must repeat smoothly');
assert.ok(hovered.leftArm > 40 && hovered.rightArm < -40, 'Hover must engage both arms');
assert.notEqual(hovered.leftHip, REST_POSE.leftHip, 'Hover must include a coordinated foot gesture');
checks++;
assert.notDeepEqual(staticCompanionPose('thinking'), staticCompanionPose('error'));
assert.notDeepEqual(staticCompanionPose('success'), staticCompanionPose('idle'));
checks++;
// Recover ankle positions from the actual rig lengths to check contact and swing clearance.
for (const direction of [1, -1]) {
  for (let index = 0; index < 1000; index++) {
    const phase = index / 1000;
    const pose = sampleWalkingPose(phase, direction);
    for (const [side, offset] of [['left', 0], ['right', .5]]) {
      const hip = pose[`${side}Hip`] * Math.PI / 180;
      const knee = pose[`${side}Knee`] * Math.PI / 180;
      const ankleY = pose.bodyY + 11 * Math.cos(hip) + 6 * Math.cos(hip + knee);
      const step = (phase + offset) % 1;
      if (step < .6) {
        assert.ok(Math.abs(ankleY - 17) < .04, 'Stance ankle must stay on the ground');
        assert.ok(Math.abs(pose[`${side}Hip`] + pose[`${side}Knee`] + pose[`${side}Foot`]) < .001, 'Stance sole must remain level');
      } else assert.ok(ankleY < 17.01, 'Swing foot must lift rather than penetrate the ground');
    }
    assert.ok(Math.abs(pose.bodyR) <= 1.2);
    const other = sampleWalkingPose((phase + .5) % 1, direction);
    assert.ok(Math.abs(pose.leftHip - other.rightHip) < .0001, 'Legs must alternate on a shared phase');
    assert.ok(Math.abs((pose.leftArm - REST_POSE.leftArm) + (pose.rightArm - REST_POSE.rightArm)) < .001, 'Arms must counter-swing');
  }
  checks++;
}
let jitter = createCompanionDrag();
for (let index = 0; index < 600; index++) jitter = advanceCompanionDrag(jitter, { x: 0, y: 0 }, { x: index % 2 ? .8 : -.8, y: -2 }, 1 / 60, index * 1000 / 60);
assert.equal(jitter.direction, 1, 'Vertical jitter must not reverse facing'); checks++;
let reverse = createCompanionDrag();
for (let index = 0; index < 5; index++) reverse = advanceCompanionDrag(reverse, { x: 0, y: 0 }, { x: -4, y: 0 }, 1 / 60, index * 1000 / 60);
assert.equal(reverse.direction, -1, 'Intentional movement must reverse facing'); checks++;
let slow = createCompanionDrag(), fast = createCompanionDrag();
for (let index = 0; index < 60; index++) {
  slow = advanceCompanionDrag(slow, { x: 0, y: 0 }, { x: .5, y: 0 }, 1 / 60, index * 1000 / 60);
  const before = fast.phase;
  fast = advanceCompanionDrag(fast, { x: 0, y: 0 }, { x: 100, y: 100 }, 1 / 60, index * 1000 / 60);
  assert.ok((fast.phase - before + 1) % 1 <= MAX_GAIT_CADENCE / 60 + .00001, 'Fast cursor motion must not create excessive cadence');
}
assert.ok(fast.speed > slow.speed && slow.speed > 25 && slow.speed < 35); checks++;
const edgePhase = fast.phase;
for (let index = 0; index < 60; index++) fast = advanceCompanionDrag(fast, { x: 16, y: 16 }, { x: 16, y: 16 }, 1 / 60, 2000 + index * 1000 / 60);
assert.equal(fast.phase, edgePhase, 'Clamped position must freeze gait phase');
assert.equal(fast.speed, 0); checks++;
const results = [30, 60, 120].map((fps) => {
  let point = { x: 0, y: 0 };
  for (let index = 0; index < fps / 5; index++) {
    const next = followCompanionPosition(point, { x: 100, y: -100 }, 1 / fps);
    assert.ok(next.x >= point.x && next.x <= 100 && next.y <= point.y && next.y >= -100, 'Following must not overshoot');
    point = next;
  }
  return point;
});
assert.ok(Math.abs(results[0].x - results[2].x) < .001, 'Following must be frame-rate independent');
assert.deepEqual(followCompanionPosition({ x: 0, y: 0 }, { x: 100, y: 50 }, 1 / 60, true), { x: 100, y: 50 }); checks++;
console.log(`Companion motion: ${checks} checks passed, 0 failed (finite poses, planted feet, coordinated gait, direction hysteresis, capped speed-based cadence, boundary stop, frame-rate independence, reduced motion and state settling).`);
