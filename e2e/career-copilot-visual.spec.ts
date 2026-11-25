import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from './fixtures';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

test('Career Copilot modes and visual QA', async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === 'mobile-390x844';
  const viewport = isMobile ? { width: 390, height: 844 } : { width: 1366, height: 768 };
  const stage = process.env.COPILOT_VISUAL_STAGE === 'before' ? 'before' : 'after';
  const outputDir = path.join(
    process.cwd(),
    'scripts',
    'visual-qa',
    'design-system',
    'career-copilot',
    stage
  );

  await mkdir(outputDir, { recursive: true });
  await page.setViewportSize(viewport);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  const launcher = page.getByRole('button', { name: /open ai assistant/i });
  await expect(launcher).toBeVisible();
  await launcher.click();

  const dialog = page.getByRole('dialog', { name: /smart resume ai assistant/i });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(400);

  const sizeLabel = `${viewport.width}x${viewport.height}`;
  if (stage === 'before') {
    await page.screenshot({
      path: path.join(outputDir, `career-copilot-${sizeLabel}.png`),
      animations: 'disabled',
    });
    return;
  }

  await expect(dialog).toHaveAttribute('data-assistant-mode', 'docked');
  await expect(dialog.getByRole('heading', { name: /career copilot/i })).toBeVisible();
  for (const chip of ['ATS', 'Resume', 'Skills', 'Projects', 'Jobs']) {
    await expect(dialog.getByRole('button', { name: chip, exact: true })).toBeVisible();
  }
  await page.screenshot({
    path: path.join(outputDir, `career-copilot-docked-${sizeLabel}.png`),
    animations: 'disabled',
  });

  await dialog.getByRole('button', { name: /expand assistant/i }).click();
  await expect(dialog).toHaveAttribute('data-assistant-mode', 'expanded');
  await page.screenshot({
    path: path.join(outputDir, `career-copilot-expanded-${sizeLabel}.png`),
    animations: 'disabled',
  });

  await dialog.getByRole('button', { name: /collapse assistant/i }).click();
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeVisible();
  await page.screenshot({
    path: path.join(outputDir, `career-copilot-collapsed-${sizeLabel}.png`),
    animations: 'disabled',
  });
});
