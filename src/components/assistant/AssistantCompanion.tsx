'use client';

import { useEffect, useId, useRef, type CSSProperties, type RefObject } from 'react';
import { CompanionArtwork } from './CompanionArtwork';
import { ROBOT_RIG } from './companionRig';
import { companionPixelSize, posterizeCompanionPixels } from './companionPixels';
import { blendPose, REST_POSE, sampleCompanionPose, staticCompanionPose, type CompanionDrag, type CompanionMotion, type CompanionPose, type CompanionState } from './companionMotion';
import styles from './AssistantCompanion.module.css';

type Props = {
  state: CompanionState; size: number; paused?: boolean; decorative?: boolean; className?: string;
  hovered?: boolean; dragging?: boolean; dragRef?: RefObject<CompanionDrag>;
};

export function AssistantCompanion({ state, size, paused = false, decorative = true, className = '', hovered = false, dragging = false, dragRef }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const surfaceRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintedRef = useRef(0);
  const pointerLookRef = useRef({ x: 0, y: 0 });
  const playbackRef = useRef<{ pose: CompanionPose; motion: CompanionMotion; turn: number } | null>(null);
  const id = `companion-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    const surface = surfaceRef.current;
    const target = surface?.parentElement;
    if (!surface || !target || !dragRef) return;
    let frame = 0, x = 0, y = 0;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX; y = event.clientY;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        const box = surface.getBoundingClientRect();
        pointerLookRef.current = { x: Math.max(-3, Math.min(3, (x - box.left - box.width / 2) / Math.max(1, box.width / 2) * 3)),
          y: Math.max(-2, Math.min(2, (y - box.top - box.height / 2) / Math.max(1, box.height / 2) * 2)) };
      });
    };
    const leave = () => { cancelAnimationFrame(frame); frame = 0; pointerLookRef.current = { x: 0, y: 0 }; };
    target.addEventListener('pointermove', move, { passive: true });
    target.addEventListener('pointerleave', leave);
    return () => { leave(); target.removeEventListener('pointermove', move); target.removeEventListener('pointerleave', leave); };
  }, [dragRef]);

  useEffect(() => {
    const svg = ref.current;
    const surface = surfaceRef.current;
    const canvas = canvasRef.current;
    if (!svg || !surface || !canvas) return;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    let disposed = false, rendering = false, queued = false;
    let image: HTMLImageElement | null = null, imageUrl: string | null = null;
    const renderPixels = () => {
      if (disposed) return;
      queued = true;
      if (rendering) return;
      queued = false;
      rendering = true;
      const width = canvas.width, height = canvas.height;
      const snapshot = svg.cloneNode(true) as SVGSVGElement;
      snapshot.removeAttribute('class');
      snapshot.removeAttribute('style');
      snapshot.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/2000/svg');
      snapshot.setAttribute('width', String(width));
      snapshot.setAttribute('height', String(height));
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(snapshot)], { type: 'image/svg+xml' }));
      const frameImage = new Image();
      image = frameImage;
      imageUrl = url;
      const finish = () => {
        URL.revokeObjectURL(url);
        image = null;
        imageUrl = null;
        rendering = false;
        // Keep only the latest pose when decoding takes longer than a paint interval.
        if (queued && !disposed) renderPixels();
      };
      frameImage.onload = () => {
        if (!disposed && canvas.width === width && canvas.height === height) {
          context.imageSmoothingEnabled = false;
          context.clearRect(0, 0, width, height);
          context.drawImage(frameImage, 0, 0, width, height);
          const pixels = context.getImageData(0, 0, width, height);
          posterizeCompanionPixels(pixels.data);
          context.putImageData(pixels, 0, 0);
          canvas.dataset.pixelReady = '1';
          canvas.dataset.pixelFrame = String(++paintedRef.current);
          canvas.dataset.pixelState = state;
        }
        finish();
      };
      frameImage.onerror = finish;
      frameImage.src = url;
    };
    const resizePixels = () => {
      const grid = companionPixelSize(surface.clientWidth, surface.clientHeight);
      if (canvas.width !== grid.width || canvas.height !== grid.height) {
        canvas.width = grid.width;
        canvas.height = grid.height;
        canvas.dataset.pixelReady = '0';
      }
      renderPixels();
    };
    canvas.dataset.pixelReady = '0';
    const pixelObserver = new ResizeObserver(resizePixels);
    pixelObserver.observe(surface);
    resizePixels();
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const joints = Object.fromEntries(Array.from(svg.querySelectorAll<SVGElement>('[data-rig]')).map((element) => [element.dataset.rig!, element]));
    let frame = 0, visible = false, lastPaint = 0, started = performance.now(), transitionStarted = started, lastTick = started;
    let currentMotion: CompanionMotion = playbackRef.current?.motion ?? state;
    let previousPose = playbackRef.current?.pose ?? { ...REST_POSE }, pose = previousPose, turn = playbackRef.current?.turn ?? dragRef?.current.direction ?? 1;
    const attention = { x: 0, y: 0 };
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
        const angle = next[key as keyof CompanionPose] + (key === 'headR' ? attention.x * .5 : 0);
        joints[joint].setAttribute('transform', `${facing}rotate(${angle.toFixed(2)} ${center})`);
      }
      joints.gaze.setAttribute('transform', `translate(${(next.lookX + (currentMotion === 'hover' && !motionPreference.matches ? attention.x : dragRef ? turn * 2.5 : 0)).toFixed(2)} ${(next.lookY + attention.y).toFixed(2)})`);
      joints.eyes.setAttribute('transform', `translate(0 90) scale(1 ${Math.max(.06, next.eyes).toFixed(3)}) translate(0 -90)`);
      joints.brows.setAttribute('transform', `translate(0 ${next.brow.toFixed(2)})`);
      joints.mouth.setAttribute('opacity', Math.min(1, .75 + next.smile * .15).toFixed(2));
      joints.shadow.setAttribute('opacity', (.13 + Math.min(0, next.bodyY) * .004).toFixed(3));
      renderPixels();
    };
    const tick = (now: number) => {
      const moving = dragging && Boolean(dragRef && dragRef.current.speed > 8 && now - dragRef.current.lastMovedAt < 100);
      const settle = currentMotion === 'walking' && !moving;
      const nextMotion: CompanionMotion = moving ? 'walking' : settle ? 'settling'
        : currentMotion === 'settling' && now - started < 480 ? 'settling'
          : state === 'idle' && hovered && !dragging ? 'hover' : state;
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
      const look = nextMotion === 'hover' ? pointerLookRef.current : { x: 0, y: 0 };
      const follow = 1 - Math.exp(-dt / .08);
      attention.x += (look.x - attention.x) * follow;
      attention.y += (look.y - attention.y) * follow;
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
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      pixelObserver.disconnect();
      if (image) { image.onload = null; image.onerror = null; }
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      document.removeEventListener('visibilitychange', sync);
      motionPreference.removeEventListener('change', sync);
    };
  }, [state, paused, hovered, dragging, dragRef]);

  return <span ref={surfaceRef} className={`${styles.surface} ${className}`} style={{ '--companion-size': `${size}px` } as CSSProperties} data-companion-renderer="pixel">
    <svg ref={ref} className={styles.character} width={size} height={size * 1.3} viewBox="0 0 160 208"
    data-companion-state={state} data-motion={state} data-active="0" aria-hidden={decorative} aria-label={decorative ? undefined : 'AI Assistant companion'} role={decorative ? undefined : 'img'} focusable="false">
    <CompanionArtwork id={id} state={state} />
    </svg>
    <canvas ref={canvasRef} className={styles.pixels} aria-hidden="true" data-pixel-ready="0" />
  </span>;
}
