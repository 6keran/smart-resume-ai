import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from './fixtures';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH, video: 'off', trace: 'off' });

test('compact companion paints crisp moving pixel frames and keeps click/minimize behavior', async ({ page, diagnostics }, info) => {
  await page.addInitScript(() => localStorage.setItem('sra_nimbus_greeting_shown', '1'));
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const button = page.getByRole('button', { name: /open ai assistant/i });
  const surface = page.locator('[data-assistant-mode="collapsed"] [data-companion-renderer="pixel"]');
  const canvas = surface.locator('canvas');
  const source = surface.locator('svg');
  await expect(canvas).toHaveAttribute('data-pixel-ready', '1');
  await expect(source).toHaveAttribute('data-active', '1');
  await expect(page.locator('[data-assistant-mode="collapsed"]')).toHaveAttribute('data-placement-ready', 'true');
  const width = page.viewportSize()!.width < 640 ? 72 : 88;
  await expect.poll(async () => (await button.boundingBox())?.width).toBe(width);
  const box = (await button.boundingBox())!;
  expect(box.width).toBe(width); expect(box.height).toBeCloseTo(width * 1.3, 1);
  const pixels = await canvas.evaluate((element) => {
    const node = element as HTMLCanvasElement;
    const context = node.getContext('2d')!;
    const data = context.getImageData(0, 0, node.width, node.height).data;
    let visible = 0, invalid = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (!data[index + 3]) continue;
      visible++;
      if (data[index + 3] !== 255 || [data[index], data[index + 1], data[index + 2]].some((value) => value !== 255 && value % 32 !== 0)) invalid++;
    }
    return { width: node.width, height: node.height, smoothing: context.imageSmoothingEnabled, rendering: getComputedStyle(node).imageRendering, visible, invalid };
  });
  expect(pixels).toMatchObject({ width, height: Math.round(width * 1.3), smoothing: false, rendering: 'pixelated', invalid: 0 });
  await expect(button.getByText('AI Assistant', { exact: true })).toBeVisible();
  expect(pixels.visible).toBeGreaterThan(pixels.width * pixels.height * .2);
  const initial = await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL())).not.toBe(initial);
  const folder = path.join(process.cwd(), 'scripts/visual-qa/mascot/hover-fixed', info.project.name);
  await mkdir(folder, { recursive: true });
  await button.screenshot({ path: path.join(folder, 'pixel-companion.png'), animations: 'allow' });
  await page.screenshot({ path: path.join(folder, 'launcher.png'), animations: 'allow' });
  await button.click();
  const panel = page.getByRole('dialog', { name: 'Smart Resume AI Assistant', exact: true });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Collapse assistant', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-pixel-ready', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(source).toHaveAttribute('data-active', '0');
  await expect(canvas).toHaveAttribute('data-pixel-ready', '1');
  // Let the one pending decode finish, then verify the actual visible pixels remain still.
  await page.waitForTimeout(100);
  const still = await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(300);
  expect(await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL())).toBe(still);
  expect(diagnostics.consoleErrors).toEqual([]);
});
