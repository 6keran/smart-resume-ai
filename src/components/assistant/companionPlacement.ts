type Point = { x: number; y: number };
type Box = { left: number; top: number; right: number; bottom: number };

export function companionBounds(width: number, height: number, element?: HTMLElement | null) {
  const viewport = window.visualViewport;
  const style = element ? getComputedStyle(element) : null;
  const inset = (side: string) => 16 + (parseFloat(style?.getPropertyValue(`--pet-safe-${side}`) || '0') || 0);
  const minX = (viewport?.offsetLeft || 0) + inset('left');
  const minY = (viewport?.offsetTop || 0) + inset('top');
  return { minX, minY, maxX: Math.max(minX, (viewport?.offsetLeft || 0) + (viewport?.width || innerWidth) - width - inset('right')),
    maxY: Math.max(minY, (viewport?.offsetTop || 0) + (viewport?.height || innerHeight) - height - inset('bottom')) };
}

export function clampCompanionPosition(x: number, y: number, width: number, height: number, element?: HTMLElement | null): Point {
  const bounds = companionBounds(width, height, element);
  return { x: Math.min(bounds.maxX, Math.max(bounds.minX, x)), y: Math.min(bounds.maxY, Math.max(bounds.minY, y)) };
}

export function safeCompanionPosition(element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();
  const layout = getComputedStyle(element);
  const width = parseFloat(layout.width) || element.offsetWidth, height = parseFloat(layout.height) || element.offsetHeight;
  // Entry/exit scale is presentation only; never persist its visual offset as a new position.
  const storedX = parseFloat(element.style.left), storedY = parseFloat(element.style.top);
  const anchorX = Number.isFinite(storedX) ? storedX : rect.left - (width - rect.width) / 2;
  const anchorY = Number.isFinite(storedY) ? storedY : rect.top - (height - rect.height) / 2;
  const current = clampCompanionPosition(anchorX, anchorY, width, height, element);
  const bounds = companionBounds(width, height, element);
  // Read layout once per scroll/resize batch; the animation loop never scans the page.
  const obstacles: Box[] = Array.from(document.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [role="button"]'))
    .filter((control) => !control.closest('[data-assistant-mode], [data-nimbus-greeting], nextjs-portal'))
    .flatMap((control) => {
      const box = control.getBoundingClientRect();
      if (!box.width || !box.height || box.bottom < bounds.minY || box.top > bounds.maxY + height || box.right < bounds.minX || box.left > bounds.maxX + width) return [];
      const style = getComputedStyle(control);
      return style.visibility === 'hidden' || style.display === 'none' ? [] : [{ left: box.left - 4, top: box.top - 4, right: box.right + 4, bottom: box.bottom + 4 }];
    });
  const free = (point: Point) => !obstacles.some((box) => point.x < box.right && point.x + width > box.left && point.y < box.bottom && point.y + height > box.top);
  if (free(current)) return current;
  const candidates: Point[] = [];
  const xs = [current.x, bounds.maxX, bounds.minX];
  for (let x = bounds.minX; x <= bounds.maxX; x += width + 8) xs.push(x);
  const ys = [current.y, bounds.maxY, bounds.minY];
  for (let y = bounds.maxY; y >= bounds.minY; y -= height / 2 + 8) ys.push(y);
  for (const x of xs) for (const y of ys) candidates.push({ x, y });
  candidates.sort((a, b) => Math.hypot(a.x - current.x, a.y - current.y) - Math.hypot(b.x - current.x, b.y - current.y));
  return candidates.find(free) || current;
}
