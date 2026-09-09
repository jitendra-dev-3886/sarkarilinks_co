import { test, expect, type Page } from '@playwright/test';
import { categories } from '../../src/api/content';
import { toolCatalog } from '../../src/features/tools/catalog';
import { informationLinks } from '../../src/features/pages/SitePages';

async function fits(page: Page, label: string) {
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: `${label} overflows at ${width}px` }).toBe(true);
  }
}
const paths = ['/', '/search', '/search?q=no-matching-audit-notice', ...categories.map(([slug]) => `/${slug}`), ...informationLinks.map(([slug]) => `/${slug}`), '/tools', ...Object.keys(toolCatalog).map(slug => `/tools/${slug}`), '/account/login', '/login', '/jobs/member-test-opportunity', '/jobs/missing-audit-notice', '/not-a-real-page', '/tools/not-a-real-tool'];
for (const path of paths) {
  test(`page audit ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(path);
    await expect(page.locator('main h1, main h2').first()).toBeVisible();
    await expect(page.getByText('Something went wrong', { exact: true })).toHaveCount(0);
    await fits(page, path);
    expect(errors).toEqual([]);
  });
}
test('all administrator panels fit desktop tablet and mobile', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/login');
  await page.getByLabel('Email address').fill('administrator@example.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Workspace sections' });
  await expect(nav).toBeVisible();
  const labels = await nav.getByRole('button').allTextContents();
  for (const label of labels) {
    await nav.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('.admin-workspace h2, .admin-workspace table').first()).toBeVisible();
    await fits(page, `admin ${label}`);
  }
  for (const tab of ['for-you', 'saved', 'preferences']) {
    await page.goto(`/account?tab=${tab}`);
    await expect(page.locator('.dashboard-welcome')).toBeVisible();
    await fits(page, `account ${tab}`);
  }
});
