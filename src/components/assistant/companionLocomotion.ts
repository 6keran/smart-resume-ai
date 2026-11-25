import type { CompanionDrag } from './companionMotion';

type Point = { x: number; y: number };
export const MAX_GAIT_CADENCE = 1.75; // Full left/right cycles per second, even during fast drags.

export function createCompanionDrag(direction: 1 | -1 = 1, phase = 0): CompanionDrag {
  return { direction, phase, distance: 0, lastMovedAt: 0, speed: 0, velocityX: 0, velocityY: 0, facingTravel: 0 };
}

// Exponential following is independent of event/frame frequency and cannot overshoot.
export function followCompanionPosition(from: Point, target: Point, seconds: number, reducedMotion = false): Point {
  if (reducedMotion || Math.hypot(target.x - from.x, target.y - from.y) < .2) return { ...target };
  const amount = 1 - Math.exp(-Math.max(0, seconds) / .055);
  return { x: from.x + (target.x - from.x) * amount, y: from.y + (target.y - from.y) * amount };
}

// Called with actual rendered/clamped displacement, never raw pointer travel.
export function advanceCompanionDrag(current: CompanionDrag, from: Point, to: Point, seconds: number, now: number): CompanionDrag {
  if (seconds <= 0) return current;
  const dx = to.x - from.x, dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const moving = distance > .02;
  const amount = 1 - Math.exp(-seconds / (moving ? .09 : .055));
  const speed = current.speed + ((moving ? distance / seconds : 0) - current.speed) * amount;
  const velocityX = current.velocityX + (dx / seconds - current.velocityX) * amount;
  const velocityY = current.velocityY + (dy / seconds - current.velocityY) * amount;
  let direction = current.direction, facingTravel = current.facingTravel;
  if (moving && Math.abs(velocityX) > 24 && Math.abs(velocityX) > speed * .25) {
    facingTravel = dx * direction < 0 ? facingTravel + Math.abs(dx) : Math.max(0, facingTravel - Math.abs(dx));
    if (facingTravel >= 12) { direction = direction === 1 ? -1 : 1; facingTravel = 0; }
  } else facingTravel = 0;
  const cadence = moving ? Math.min(MAX_GAIT_CADENCE, speed / 110) : 0;
  return { direction, facingTravel, velocityX, velocityY, speed: speed < .1 ? 0 : speed,
    distance: current.distance + distance, lastMovedAt: moving ? now : current.lastMovedAt,
    phase: (current.phase + cadence * seconds) % 1 };
}
