import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';

async function signIn(page: import('@playwright/test').Page, role: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(`${role}@example.test`);
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Content & administration' })).toBeVisible();
}

test('author submits, independent reviewer publishes, public page displays the notice', async ({ page }) => {
  await signIn(page, 'author');
  await page.getByRole('button', { name: 'New draft' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Browser test recruitment notice');
  await page.getByLabel('URL slug').fill('browser-test-recruitment');
  await page.getByLabel('Issuing organization').fill('Synthetic Test Department');
  await page.getByLabel('Official source URL').fill('https://example.org/test-notice');
  await page.getByLabel('Summary', { exact: true }).fill('Synthetic browser test content. Not a real government notice.');
  await page.getByLabel('Notice details').fill('This record tests the full editorial publishing workflow.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('button', { name: 'Browser test recruitment notice' })).toBeVisible();
  await page.getByRole('button', { name: 'submit', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm submit' }).click();
  await expect(page.getByRole('cell', { name: 'in review', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'approve', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await signIn(page, 'reviewer');
  await page.getByRole('button', { name: 'approve', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm approve' }).click();
  await page.getByRole('button', { name: 'publish', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm publish' }).click();
  await page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Browser test recruitment notice', exact: true }) }).getByRole('link', { name: 'View public page' }).click();
  await expect(page.getByRole('heading', { name: 'Browser test recruitment notice' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View official source' })).toHaveAttribute('href', 'https://example.org/test-notice');
});

test('administrator sees permission matrix and audit while operations cannot manage users', async ({ page }) => {
  await signIn(page, 'administrator');
  await page.getByRole('button', { name: 'Permission matrix' }).click();
  await expect(page.getByRole('heading', { name: 'Role permission matrix' })).toBeVisible();
  await page.getByRole('button', { name: 'Audit history' }).click();
  await expect(page.getByRole('heading', { name: 'Immutable audit history' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await signIn(page, 'operations');
  await expect(page.getByRole('button', { name: 'Users & roles' })).toHaveCount(0);
  const response = await page.request.get('/api/v1/admin/users', { headers: { Accept: 'application/json' } });
  expect(response.status()).toBe(403);
});

test('homepage fits desktop and mobile without horizontal overflow', async ({ page }) => {
  for (const width of [1536, 390]) {
    await page.setViewportSize({ width, height: 1024 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Government Jobs, Results & Admit Cards' })).toBeVisible();
    await expect(page.getByText('Loading latest updates…')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
  }
});

test('advertisement PDF is extracted, reviewed and saved to a category draft', async ({ page }) => {
  await signIn(page, 'author');
  await page.getByRole('button', { name: 'Advertisement imports', exact: true }).click();
  await page.getByLabel('Advertisement file').setInputFiles(resolve('..', '.cache/extraction-tests/recruitment.pdf'));
  await page.getByLabel('Official source URL').fill('https://example.org/synthetic-advertisement');
  await page.getByRole('button', { name: 'Upload & extract', exact: true }).click();
  await expect(page.getByLabel('Destination section')).toBeVisible({ timeout: 45000 });
  await expect(page.getByLabel('Destination section')).toHaveValue('jobs');
  await expect(page.getByRole('textbox', { name: 'Vacancies', exact: true })).toHaveValue('Total vacancies: 120 posts');
  await page.getByLabel('Title', { exact: true }).fill('Imported synthetic recruitment');
  await page.getByLabel('URL slug').fill('imported-synthetic-recruitment');
  await page.getByLabel('I compared these fields').check();
  await page.getByRole('button', { name: 'Create draft in selected section' }).click();
  await expect(page.getByText(/Draft #\d+ was saved/)).toBeVisible();
  const response = await page.request.get('/api/v1/content/jobs/imported-synthetic-recruitment');
  expect(response.status()).toBe(404);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/import-mobile.png', fullPage: true });
});

test('search filters are removable and calculators handle invalid date order', async ({ page }) => {
  await page.goto('/jobs?qualification=graduate&sort=closing-soon');
  await page.getByRole('button', { name: 'Remove qualification filter' }).click();
  await expect(page).not.toHaveURL(/qualification=/);
  await expect(page).toHaveURL(/sort=closing-soon/);
  await page.goto('/tools/age');
  const age = page.locator('#age');
  await age.getByLabel('Date of birth').fill('2000-09-20');
  await age.getByLabel('Cut-off date').fill('2026-09-19');
  await age.getByRole('button', { name: 'Calculate' }).click();
  await expect(age.locator('output')).toHaveText('25 completed years on the selected cut-off date.');
  await age.getByLabel('Cut-off date').fill('1999-09-19');
  await age.getByRole('button', { name: 'Calculate' }).click();
  await expect(age.locator('output')).toContainText('on or after');
});
