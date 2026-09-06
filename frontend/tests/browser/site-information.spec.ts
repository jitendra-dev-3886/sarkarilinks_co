import { test, expect } from '@playwright/test';

test('administrator edits public information; footer categories and organization shortcuts work', async ({ page, browser }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('administrator@example.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Site information', exact: true }).click();
  await page.getByLabel('Site operator / business name').fill('Synthetic Portal Owner');
  await page.getByLabel('Public support email').fill('support@example.test');
  await page.getByLabel('Public address (optional)').fill('Synthetic test address');
  await page.getByLabel('Page title', { exact: true }).fill('About our test portal');
  await page.getByLabel('Page to edit').selectOption('faq');
  await page.getByRole('button', { name: 'Save site information', exact: true }).click();
  await expect(page.getByText('Site information saved and audited.')).toBeVisible();
  await expect(page.getByLabel('Page to edit')).toHaveValue('faq');
  await page.reload();
  await page.getByRole('button', { name: 'Site information', exact: true }).click();
  await expect(page.getByLabel('Site operator / business name')).toHaveValue('Synthetic Portal Owner');
  const context = await browser.newContext({ baseURL: new URL(page.url()).origin }), visitor = await context.newPage();
  try {
    await visitor.goto('/about-us');
    await expect(visitor.getByRole('heading', { name: 'About our test portal', exact: true })).toBeVisible();
    await expect(visitor).toHaveTitle('About our test portal | SarkariLinks');
    await visitor.goto('/contact-us');
    await expect(visitor.getByRole('link', { name: 'Email support' })).toHaveAttribute('href', 'mailto:support@example.test');
    for (const [slug, title] of [['admissions','Admissions'], ['certificate-verification','Certificate Verification']]) {
      await visitor.goto('/sitemap');
      await visitor.locator('main').getByRole('link', { name: title, exact: true }).click();
      await expect(visitor).toHaveURL(new RegExp(`/${slug}$`));
      await expect(visitor.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(visitor.getByRole('heading', { name: 'No updates found' })).toBeVisible();
    }
    await visitor.goto('/sitemap');
    await visitor.locator('main').getByRole('link', { name: 'UPSSSC', exact: true }).click();
    await expect(visitor).toHaveURL(/search\?q=UPSSSC/);
    await visitor.goto('/sitemap');
    await expect(visitor.getByRole('link', { name: 'XML sitemap for search engines' })).toHaveAttribute('href', '/sitemap.xml');
    await visitor.setViewportSize({ width: 320, height: 900 });
    expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await visitor.goto('/privacy-policy');
    await expect(visitor.getByText('Draft: awaiting site-operator review.')).toBeVisible();
    await expect(visitor.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
    expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});
