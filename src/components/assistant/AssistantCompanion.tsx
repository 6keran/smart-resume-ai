'use client';

import { useEffect, useId, useRef, type RefObject } from 'react';
import { CompanionArtwork } from './CompanionArtwork';
import { ROBOT_RIG } from './companionRig';
import { blendPose, REST_POSE, sampleCompanionPose, staticCompanionPose, type CompanionDrag, type CompanionMotion, type CompanionPose, type CompanionState } from './companionMotion';
import styles from './AssistantCompanion.module.css';

type Props = {
  state: CompanionState; size: number; paused?: boolean; decorative?: boolean; className?: string;
  hovered?: boolean; dragging?: boolean; dragRef?: RefObject<CompanionDrag>;
};

export function AssistantCompanion({ state, size, paused = false, decorative = true, className = '', hovered = false, dragging = false, dragRef }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const playbackRef = useRef<{ pose: CompanionPose; motion: CompanionMotion; turn: number } | null>(null);
  const id = `companion-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const joints = Object.fromEntries(Array.from(svg.querySelectorAll<SVGElement>('[data-rig]')).map((element) => [element.dataset.rig!, element]));
    let frame = 0, visible = false, lastPaint = 0, started = performance.now(), transitionStarted = started, lastTick = started;
    let currentMotion: CompanionMotion = playbackRef.current?.motion ?? state;
    let previousPose = playbackRef.current?.pose ?? { ...REST_POSE }, pose = previousPose, turn = playbackRef.current?.turn ?? dragRef?.current.direction ?? 1;
    let lastDirection = dragRef?.current.direction ?? 1;
    const rotationCenters: Partial<Record<keyof CompanionPose, string>> = ROBOT_RIG;
    const draw = (next: CompanionPose) => {
      joints.body.setAttribute('transform', `translate(0 ${next.bodyY.toFixed(2)}) rotate(${next.bodyR.toFixed(2)} 80 170)`);
      // Facing affects gaze/posture only. Never mirror or squeeze the complete artwork.
      joints.turn.setAttribute('transform', 'translate(0 0)');
      joints.breath.setAttribute('transform', `translate(80 170) scale(${(1 + (next.breath - 1) * .45).toFixed(4)} ${next.breath.toFixed(4)}) translate(-80 -170)`);
      for (const [key, center] of Object.entries(rotationCenters)) {
        const joint = key === 'headR' ? 'head' : key;
        const facing = key === 'headR' && dragRef ? `translate(${(turn * 1.5).toFixed(2)} 0) ` : '';
        joints[joint].setAttribute('transform', `${facing}rotate(${next[key as keyof CompanionPose].toFixed(2)} ${center})`);
      }
      joints.gaze.setAttribute('transform', `translate(${(next.lookX + (dragRef ? turn * 2.5 : 0)).toFixed(2)} ${next.lookY.toFixed(2)})`);
      joints.eyes.setAttribute('transform', `translate(0 90) scale(1 ${Math.max(.06, next.eyes).toFixed(3)}) translate(0 -90)`);
      joints.brows.setAttribute('transform', `translate(0 ${next.brow.toFixed(2)})`);
      joints.mouth.setAttribute('opacity', Math.min(1, .75 + next.smile * .15).toFixed(2));
      joints.shadow.setAttribute('opacity', (.13 + Math.min(0, next.bodyY) * .004).toFixed(3));
    };
    const tick = (now: number) => {
      const moving = dragging && Boolean(dragRef && dragRef.current.speed > 8 && now - dragRef.current.lastMovedAt < 100);
      const settle = currentMotion === 'walking' && !moving;
      const nextMotion: CompanionMotion = moving ? 'walking' : settle ? 'settling'
        : currentMotion === 'settling' && now - started < 480 ? 'settling'
          : state === 'idle' && hovered ? 'hover' : state;
      const direction = dragRef?.current.direction ?? 1;
      if (nextMotion !== currentMotion || direction !== lastDirection) {
        previousPose = pose;
        if (nextMotion !== currentMotion) { currentMotion = nextMotion; started = now; }
        lastDirection = direction;
        transitionStarted = now;
      }
      const dt = Math.min(.05, Math.max(0, (now - lastTick) / 1000));
      lastTick = now;
      turn += (direction - turn) * (1 - Math.exp(-dt / .12));
      if (now - lastPaint >= 1000 / (moving ? 30 : 24)) {
        lastPaint = now;
        const mix = Math.min(1, (now - transitionStarted) / 180);
        pose = blendPose(previousPose, sampleCompanionPose(currentMotion, now - started, dragRef?.current.phase, direction), mix * mix * (3 - 2 * mix));
        draw(pose);
        if (state === 'thinking') Array.from(joints.activity.children).forEach((dot, index) => dot.setAttribute('opacity', (.35 + .65 * (1 + Math.sin((now - started) / 260 - index * 1.1)) / 2).toFixed(2)));
        playbackRef.current = { pose, motion: currentMotion, turn };
        svg.dataset.motion = currentMotion;
        svg.dataset.frame = String(Math.floor((now - started) / (1000 / 24)));
        svg.dataset.direction = direction === -1 ? 'left' : 'right';
        svg.dataset.speed = (dragRef?.current.speed ?? 0).toFixed(2);
        svg.dataset.phase = (dragRef?.current.phase ?? 0).toFixed(4);
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      const active = visible && !document.hidden && !paused && !motionPreference.matches;
      svg.dataset.active = active ? '1' : '0';
      svg.dataset.reducedMotion = String(motionPreference.matches);
      if (active) {
        started = transitionStarted = lastTick = performance.now();
        lastPaint = 0;
        frame = requestAnimationFrame(tick);
      } else {
        if (paused || document.hidden || motionPreference.matches) draw(staticCompanionPose(state));
        svg.dataset.motion = state;
        svg.dataset.frame = '0';
      }
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(svg);
    document.addEventListener('visibilitychange', sync);
    motionPreference.addEventListener('change', sync);
    sync();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', sync); motionPreference.removeEventListener('change', sync); };
  }, [state, paused, hovered, dragging, dragRef]);

  return <svg ref={ref} className={`${styles.character} ${className}`} width={size} height={size * 1.3} viewBox="0 0 160 208"
    data-companion-state={state} data-motion={state} data-active="0" aria-hidden={decorative} aria-label={decorative ? undefined : 'AI Assistant companion'} role={decorative ? undefined : 'img'} focusable="false">
    <CompanionArtwork id={id} state={state} />
  </svg>;
}
