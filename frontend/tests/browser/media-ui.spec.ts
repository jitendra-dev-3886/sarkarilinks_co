import { test, expect } from '@playwright/test';
test('media downloader presents guest access and authenticated download states', async ({ page }) => {
  await page.goto('/tools/media-downloader');
  await expect(page.getByRole('heading', { name: 'Prepare your download' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in to prepare a download' })).toHaveAttribute('href', '/account/login?returnTo=%2Ftools%2Fmedia-downloader');
  await page.getByRole('link', { name: 'Sign in to prepare a download' }).click();
  await page.getByLabel('Email address').fill('administrator@example.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Sign in to my workspace' }).click();
  await expect(page).toHaveURL(/tools\/media-downloader$/);
  const future = new Date(Date.now() + 3600000).toISOString();
  const base = { url: 'https://www.youtube.com/watch?v=fixture', format: 'video', expires_at: future, size: null, error: null, title: 'Test media' };
  let posted: unknown;
  await page.route('**/api/v1/account/downloads', async route => {
    if (route.request().method() === 'POST') { posted = route.request().postDataJSON(); return route.fulfill({ status: 202, json: { data: { id: 'queued', status: 'queued' } } }); }
    await route.fulfill({ json: { data: [ { ...base, id: 'ready', status: 'ready', size: 1024 }, { ...base, id: 'failed', status: 'failed', error: 'Source unavailable' }, { ...base, id: 'queued', status: 'queued' }, { ...base, id: 'expired', status: 'ready', expires_at: new Date(Date.now() - 1000).toISOString() } ] } });
  });
  await page.reload();
  await expect(page.getByText('Ready to download', { exact: true })).toBeVisible();
  await expect(page.getByText('In queue', { exact: true })).toBeVisible();
  await expect(page.getByText('Expired', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download video' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Use link again' }).first().click();
  await expect(page.getByLabel('Public media URL')).toHaveValue(base.url);
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.getByRole('radio', { name: 'Audio (MP3)', exact: true }).check();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Prepare download', exact: true }).click();
  await expect(page.getByText('Request submitted.', { exact: false })).toBeVisible();
  expect(posted).toEqual({ url: base.url, format: 'audio', permission: true });
  for (const width of [1440, 768, 320]) { await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
});
