import { test, expect } from '@playwright/test';

test('homepage gives direct access to core tasks and document utilities', async ({ page }) => {
  await page.goto('/');
  const shortcuts = page.getByRole('navigation', { name: 'Notice categories' });
  for (const [name, path] of [['Latest jobs','/jobs?locale=en'], ['Results','/results?locale=en'], ['Admit cards','/admit-cards?locale=en'], ['Application tools','/tools']]) {
    await expect(shortcuts.getByRole('link', { name: new RegExp(name.replace('&', '\\&')) })).toHaveAttribute('href', path);
  }
  await page.locator('.classic-column').getByRole('link', { name: 'CV & resume builder', exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/resume-builder$/);
  await expect(page.getByLabel('Full name', { exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByLabel('Search jobs and updates').fill('SSC CGL');
  await page.getByRole('button', { name: 'Search notices' }).click();
  await expect(page).toHaveURL(/\/search\?q=SSC%20CGL$/);
  await expect(page.getByRole('heading', { name: /Results for/ })).toContainText('SSC CGL');
});
