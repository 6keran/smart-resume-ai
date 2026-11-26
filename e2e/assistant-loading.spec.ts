import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from './fixtures';

test.use({ trace: 'off', video: 'off' });

async function assistantChunks() {
  const folder = path.join(process.cwd(), '.next/static/chunks');
  const files = await readdir(folder);
  const matches = await Promise.all(files.filter((name) => name.endsWith('.js')).map(async (name) =>
    (await readFile(path.join(folder, name), 'utf8')).includes('Hello! I am your AI Assistant.') ? name : null));
  return matches.filter((name): name is string => Boolean(name));
}

test('public pages avoid downloading the full authenticated assistant', async ({ page, diagnostics }) => {
  const chunks = await assistantChunks();
  expect(chunks.length).toBeGreaterThan(0);
  const loaded: string[] = [];
  page.on('request', (request) => loaded.push(request.url().split('/').pop()!));
  await page.goto('/');
  await expect(page.getByRole('heading').first()).toBeVisible();
  await page.waitForTimeout(400);
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible();
  expect(loaded.filter((name) => chunks.includes(name))).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('an early assistant click survives chunk loading and conversation survives client navigation', async ({ page, context, diagnostics }) => {
  const storage = JSON.parse(await readFile(process.env.E2E_STORAGE_STATE_PATH!, 'utf8'));
  await context.addCookies(storage.cookies);
  await page.addInitScript(() => localStorage.setItem('sra_nimbus_greeting_shown', '1'));
  const chunks = await assistantChunks();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let requested!: () => void;
  const requestStarted = new Promise<void>((resolve) => { requested = resolve; });
  await page.route(/\/_next\/static\/chunks\/[^/]+\.js$/, async (route) => {
    if (chunks.includes(route.request().url().split('/').pop()!)) { requested(); await gate; }
    await route.continue();
  });
  await page.route('**/api/chat', (route) => route.fulfill({ json: { reply: 'Use only your confirmed career facts.', provider: 'Isolated browser test' } }));
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await requestStarted;
  await page.getByRole('button', { name: 'Ask AI Assistant', exact: true }).click();
  release();
  const panel = page.getByRole('dialog', { name: 'Smart Resume AI Assistant', exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('textbox')).toHaveValue(/Review my profile/);
  await panel.getByRole('textbox').press('Enter');
  await expect(panel.getByText('Use only your confirmed career facts.', { exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Collapse assistant', exact: true }).click();
  await page.getByRole('link', { name: 'Open Resume Editor', exact: true }).click();
  await expect(page).toHaveURL(/\/builder$/);
  await page.getByRole('button', { name: /open ai assistant/i }).click();
  await expect(panel.getByText('Use only your confirmed career facts.', { exact: true })).toBeVisible();
  expect(diagnostics.consoleErrors).toEqual([]);
});
