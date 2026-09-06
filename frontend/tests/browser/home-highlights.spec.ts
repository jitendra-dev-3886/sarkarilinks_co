import { test, expect } from '@playwright/test';

test('hot jobs exclude expired notices and latest ticker pauses for readers', async ({ page }) => {
  const notices = [
    { id: 901, type: 'jobs', slug: 'open-notice', title: 'Open opportunity for applicants with a long descriptive title', closing_date: '2099-12-31' },
    { id: 902, type: 'jobs', slug: 'expired-notice', title: 'Expired opportunity', closing_date: '2000-01-01' },
    { id: 903, type: 'results', slug: 'new-result', title: 'Latest examination result and complete marks announcement', closing_date: null },
  ].map(item => ({ ...item, locale: 'en', summary: 'Browser fixture', organization: 'Test authority', published_at: '2026-09-06T00:00:00Z' }));
  await page.route('**/api/v1/content?**', async route => {
    const url = new URL(route.request().url());
    if (!['8', '12'].includes(url.searchParams.get('per_page') ?? '')) return route.continue();
    const data = url.searchParams.get('type') === 'jobs' ? notices.filter(item => item.type === 'jobs') : notices;
    await route.fulfill({ json: { data, meta: { current_page: 1, last_page: 1, total: data.length } } });
  });
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto('/');
  const hot = page.getByRole('region', { name: 'Hot jobs', exact: true });
  await expect(hot.getByRole('link', { name: /Open opportunity/ })).toBeVisible();
  await expect(hot.getByText('Expired opportunity')).toHaveCount(0);
  const ticker = page.getByRole('region', { name: 'Latest updates', exact: true });
  await expect(ticker.getByRole('link', { name: /Latest examination result/ })).toHaveAttribute('href', '/results/new-result?locale=en');
  await ticker.getByRole('button', { name: 'Pause scrolling' }).click();
  await expect(ticker.getByRole('button', { name: 'Resume scrolling' })).toHaveAttribute('aria-pressed', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ticker.getByRole('button', { name: 'Resume scrolling' }).click();
  const viewport = ticker.locator('.ticker-window');
  await viewport.evaluate(node => { node.scrollLeft = 60; });
  const before = await viewport.evaluate(node => node.scrollLeft);
  await page.waitForTimeout(250);
  expect(await viewport.evaluate(node => node.scrollLeft)).toBe(before);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await hot.getByRole('link', { name: /Open opportunity/ }).click();
  await expect(page).toHaveURL(/\/jobs\/open-notice\?locale=en$/);
});
