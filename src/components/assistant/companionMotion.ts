// Original articulated animation tracks for Smart Resume AI. No Codex art or frames.
export type CompanionState = 'idle' | 'greeting' | 'listening' | 'thinking' | 'answering' | 'success' | 'limited' | 'error';
export type CompanionMotion = CompanionState | 'walking' | 'hover' | 'settling';
export type CompanionDrag = {
  direction: 1 | -1; distance: number; lastMovedAt: number; speed: number; phase: number;
  velocityX: number; velocityY: number; facingTravel: number;
};
export type CompanionPose = {
  bodyY: number; bodyR: number; breath: number; headR: number; lookX: number; lookY: number;
  eyes: number; brow: number; smile: number; leftArm: number; rightArm: number;
  leftElbow: number; rightElbow: number; leftHip: number; rightHip: number;
  leftKnee: number; rightKnee: number; leftFoot: number; rightFoot: number;
};
type Keyframe = [number, Partial<CompanionPose>];

export const REST_POSE: CompanionPose = {
  bodyY: 0, bodyR: 0, breath: 1, headR: 0, lookX: 0, lookY: 0, eyes: 1, brow: 0,
  smile: 1, leftArm: 6, rightArm: -6, leftElbow: -8, rightElbow: 8,
  leftHip: 0, rightHip: 0, leftKnee: 0, rightKnee: 0, leftFoot: 0, rightFoot: 0,
};

export const MOTION_DURATION: Record<CompanionMotion, number> = {
  idle: 8400, greeting: 1400, listening: 1600, thinking: 3600, answering: 1600,
  success: 1900, limited: 8400, error: 1500, walking: 720, hover: 900, settling: 480,
};

const tracks: Record<CompanionMotion, Keyframe[]> = {
  idle: [
    [0, {}], [.18, { headR: -3, lookX: -2, leftElbow: -12 }],
    [.3, { headR: -3, lookX: -2 }], [.42, {}],
    [.64, { headR: 3, lookX: 2, rightArm: -9, rightElbow: 12 }],
    [.78, { headR: 2, lookX: 1 }], [1, {}],
  ],
  greeting: [
    [0, {}], [.18, { headR: -5, rightArm: -120, rightElbow: 35, smile: 1.5 }],
    [.32, { rightArm: -112, rightElbow: 12, headR: -4, smile: 1.5 }],
    [.46, { rightArm: -120, rightElbow: 40, smile: 1.5 }],
    [.6, { rightArm: -112, rightElbow: 12, smile: 1.5 }], [.82, { headR: -3 }], [1, {}],
  ],
  listening: [[0, {}], [.3, { headR: -4, lookY: -1.5, brow: -1, rightElbow: 16 }], [.8, { headR: -4, lookY: -1.5, brow: -1 }], [1, {}]],
  thinking: [
    [0, { headR: 5, lookY: -2, leftArm: -100, leftElbow: -42, rightElbow: 24, smile: .2 }],
    [.25, { headR: 8, lookX: 2, lookY: -2, leftArm: -104, leftElbow: -45, rightElbow: 26, brow: -2, smile: .2 }],
    [.56, { headR: 5, lookX: 1, lookY: -2, leftArm: -100, leftElbow: -42, smile: .2 }],
    [.8, { headR: 6, lookX: 2, lookY: -1, leftArm: -102, leftElbow: -44, smile: .2 }],
    [1, { headR: 5, lookY: -2, leftArm: -100, leftElbow: -42, rightElbow: 24, smile: .2 }],
  ],
  answering: [
    [0, {}], [.18, { bodyY: 2, headR: 6, eyes: .8, leftArm: 14, rightArm: -14 }],
    [.38, { bodyY: -2, headR: -4, rightArm: -55, rightElbow: 20, smile: 1.6, brow: -2 }],
    [.66, { headR: 3, rightArm: -38, rightElbow: 28, smile: 1.4 }], [1, {}],
  ],
  success: [
    [0, {}], [.12, { bodyY: 4, leftHip: -8, rightHip: 8, leftKnee: 14, rightKnee: -14, smile: 1.5 }],
    [.3, { bodyY: -8, leftArm: 130, rightArm: -130, leftElbow: -25, rightElbow: 25, leftHip: 8, rightHip: -8, smile: 1.8, eyes: .75 }],
    [.44, { bodyY: 3, leftArm: 80, rightArm: -120, leftKnee: 10, rightKnee: -10, smile: 1.7 }],
    [.6, { rightArm: -115, rightElbow: 40, smile: 1.6 }],
    [.76, { rightArm: -115, rightElbow: 12, smile: 1.6 }], [1, {}],
  ],
  error: [
    [0, {}], [.22, { bodyY: 2, headR: 8, brow: 3, smile: -.8, leftArm: 12, rightArm: -12 }],
    [.43, { headR: -5, eyes: .8, brow: 3, smile: -.8, rightElbow: 24 }],
    [.64, { headR: 5, brow: 2, smile: -.6, rightElbow: 18 }], [.82, { headR: 2, smile: .3 }], [1, {}],
  ],
  limited: [[0, { eyes: .8, smile: .5 }], [1, { eyes: .8, smile: .5 }]],
  // A pointer-driven open-arm step, repeating only while the user hovers.
  hover: [[0, {}], [.16, { bodyY: 1.2, headR: -3, leftArm: 48, rightArm: -48, leftElbow: -12, rightElbow: 12, leftHip: -14, leftKnee: 18, leftFoot: -4, smile: 1.4 }],
    [.38, { bodyY: -1.5, bodyR: 1.5, leftArm: 58, rightArm: -58, leftHip: -10, leftKnee: 14, leftFoot: -4, smile: 1.4 }],
    [.62, { bodyY: 1, bodyR: -1.5, leftArm: 38, rightArm: -38, rightHip: 14, rightKnee: -18, rightFoot: 4, smile: 1.4 }], [.82, {}], [1, {}]],
  settling: [[0, { bodyY: 2, leftKnee: 7, rightKnee: -7, leftArm: 14, rightArm: -14 }], [.4, { bodyY: -1, headR: -2 }], [1, {}]],
  walking: [[0, {}], [1, {}]], // Foot trajectories are solved below rather than independently keyframed.
};

export function blendPose(from: CompanionPose, to: CompanionPose, amount: number): CompanionPose {
  const pose = { ...from };
  for (const key of Object.keys(pose) as Array<keyof CompanionPose>) pose[key] += (to[key] - from[key]) * amount;
  return pose;
}

// A shared phase gives each leg a planted stance (60%) and a lifted swing (40%).
// The lengths match the unchanged rig's hip/knee/ankle anchors: 11 + 6 SVG units.
export function sampleWalkingPose(phase: number, direction: 1 | -1 = 1): CompanionPose {
  const cycle = ((phase % 1) + 1) % 1;
  const wave = Math.cos(cycle * Math.PI * 2);
  const pose = { ...REST_POSE, bodyY: .8 + .8 * Math.cos(cycle * Math.PI * 4),
    bodyR: Math.sin(cycle * Math.PI * 2) * 1.2, headR: -Math.sin(cycle * Math.PI * 2) * .6 };
  for (const [side, offset] of [['left', 0], ['right', .5]] as const) {
    const step = (cycle + offset) % 1;
    const swing = Math.max(0, (step - .6) / .4);
    const ease = swing * swing * (3 - 2 * swing);
    const x = (step < .6 ? 4.5 - 9 * step / .6 : -4.5 + 9 * ease) * direction;
    const lift = step < .6 ? 0 : 3.2 * Math.sin(Math.PI * swing) ** 2;
    const y = 17 - pose.bodyY - lift;
    const reach = Math.min(16.98, Math.hypot(x, y));
    const hip = -Math.atan2(x, y) - direction * Math.acos((121 + reach * reach - 36) / (22 * reach));
    const knee = direction * Math.acos((reach * reach - 121 - 36) / 132);
    const degrees = 180 / Math.PI;
    pose[`${side}Hip`] = hip * degrees;
    pose[`${side}Knee`] = knee * degrees;
    // Counter-rotate the ankle to keep the stance sole level; lift the swing toe.
    pose[`${side}Foot`] = -(hip + knee) * degrees - direction * Math.sin(Math.PI * swing) * 8;
  }
  pose.leftArm += wave * 17 * direction;
  pose.rightArm -= wave * 17 * direction;
  pose.leftElbow -= (1 - wave) * 4;
  pose.rightElbow += (1 + wave) * 4;
  return pose;
}

export function sampleCompanionPose(motion: CompanionMotion, elapsed: number, phase = 0, direction: 1 | -1 = 1): CompanionPose {
  if (motion === 'walking') return sampleWalkingPose(phase, direction);
  const loops = motion === 'idle' || motion === 'thinking' || motion === 'limited' || motion === 'hover';
  const progress = loops
    ? (elapsed % MOTION_DURATION[motion]) / MOTION_DURATION[motion]
    : Math.min(1, elapsed / MOTION_DURATION[motion]);
  const track = tracks[motion];
  const end = track.findIndex(([time]) => time >= progress);
  const index = Math.max(1, end);
  const [startTime, start] = track[index - 1];
  const [endTime, finish] = track[index];
  const raw = (progress - startTime) / (endTime - startTime);
  const mix = raw * raw * (3 - 2 * raw);
  const pose = blendPose({ ...REST_POSE, ...start }, { ...REST_POSE, ...finish }, mix);
  pose.breath = 1 + Math.sin(elapsed / 650) * .012;
  const blinkPhase = elapsed % 4200;
  if (blinkPhase > 3950) pose.eyes *= 1 - .94 * Math.sin((blinkPhase - 3950) / 250 * Math.PI);
  return pose;
}

export function staticCompanionPose(state: CompanionMotion): CompanionPose {
  return sampleCompanionPose(state, MOTION_DURATION[state] * .3, state === 'walking' ? .125 : 0);
}
