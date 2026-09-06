import { test, expect } from '@playwright/test';

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
  await page.getByRole('link', { name: 'View public page' }).click();
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
    await expect(page.getByRole('heading', { name: 'Find Your Dream Government Job' })).toBeVisible();
    await expect(page.getByText('Loading latest updates…')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
  }
});
