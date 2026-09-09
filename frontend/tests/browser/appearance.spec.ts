import { test, expect, type Page } from '@playwright/test';

async function admin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('administrator@example.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Homepage appearance', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Homepage appearance', exact: true })).toBeVisible();
}

test('administrator controls reading size within one consistent layout', async ({ page }) => {
  await admin(page);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByLabel('Homepage structure')).toHaveCount(0);
  await page.getByRole('group', { name: 'Reading size', exact: true }).getByRole('radio', { name: 'Larger', exact: true }).check();
  await page.getByRole('button', { name: 'Save reading size', exact: true }).click();
  await expect(page.getByText('Reading size saved for all visitors.', { exact: true })).toBeVisible();
  await page.goto('/?theme-preview=studio&layout-preview=theme');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'modern');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
  await expect(page.locator('.compact-cards')).toBeVisible();
  await expect(page.getByLabel('Search jobs and updates')).toHaveCSS('font-size', '18px');
  await page.getByLabel('Search jobs and updates').fill('Synthetic');
  await page.getByRole('button', { name: 'Search notices', exact: true }).click();
  await expect(page).toHaveURL(/search\?q=Synthetic/);
  await page.goto('/admin?tab=appearance');
  await page.getByRole('button', { name: 'Homepage appearance', exact: true }).click();
  await page.getByRole('group', { name: 'Reading size', exact: true }).getByRole('radio', { name: 'Standard', exact: true }).check();
  await page.getByRole('button', { name: 'Save reading size', exact: true }).click();
  await expect(page.getByText('Reading size saved for all visitors.', { exact: true })).toBeVisible();
});
