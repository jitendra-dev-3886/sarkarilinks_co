import { test, expect } from '@playwright/test';

test('exam update desk separates categories, switches language and refreshes notices', async ({ page }) => {
  let revision = 1;
  await page.route('**/api/v1/content?*', async route => {
    const params = new URL(route.request().url()).searchParams;
    const type = params.get('type');
    if (!['results', 'admit-cards', 'answer-keys'].includes(type ?? '')) return route.continue();
    const data = params.get('locale') === 'hi' ? [] : [{ id: 100, type, slug: 'fixture-notice', title: `Fixture ${type} ${revision}`, organization: 'Synthetic examination board', published_at: '2026-09-05T10:00:00Z', locale: 'en' }];
    await route.fulfill({ json: { data, meta: { current_page: 1, last_page: 1, total: data.length } } });
  });
  await page.goto('/');
  const board = page.locator('.home-notice-board');
  for (const type of ['results', 'admit-cards', 'answer-keys']) {
    await expect(board.getByRole('link', { name: `Fixture ${type} 1`, exact: true })).toHaveAttribute('href', `/${type}/fixture-notice?locale=en`);
  }
  revision = 2;
  await board.getByRole('button', { name: 'Refresh notices' }).click();
  await expect(board.getByRole('link', { name: 'Fixture results 2', exact: true })).toBeVisible();
  await board.getByLabel('Notice language').selectOption('hi');
  await expect(board.getByText(/No published .* in Hindi yet/)).toHaveCount(3);
  await expect(board.getByRole('link', { name: 'View all results', exact: true })).toHaveAttribute('href', '/results?locale=hi');
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
