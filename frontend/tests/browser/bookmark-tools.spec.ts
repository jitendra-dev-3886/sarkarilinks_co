import { test, expect } from '@playwright/test';

test('guest returns to the notice after registration and can save and remove it', async ({ page }) => {
  await page.goto('/jobs/member-test-opportunity');
  await page.getByRole('link', { name: 'Save job', exact: true }).click();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByLabel('Full name').fill('Bookmark Reader');
  await page.getByLabel('Email address').fill('bookmark-reader@example.test');
  await page.getByLabel('Password', { exact: true }).fill('MemberBrowser123!');
  await page.getByLabel('Confirm password').fill('MemberBrowser123!');
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(page).toHaveURL(/jobs\/member-test-opportunity\?locale=en/);
  await page.getByRole('button', { name: 'Save job', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Saved', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save job', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('tool search trims whitespace and empty filters can be reset', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('searchbox', { name: 'Find a tool' }).fill('   PDF   ');
  await expect(page.locator('.tool-card').first()).toBeVisible();
  await page.getByRole('searchbox', { name: 'Find a tool' }).fill('no-tool-matches-this');
  await expect(page.getByRole('heading', { name: 'No tools found' })).toBeVisible();
  await page.getByRole('button', { name: 'Show all tools' }).click();
  await expect(page.locator('.tool-card')).toHaveCount(12);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
