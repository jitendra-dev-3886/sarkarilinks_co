import { test, expect } from '@playwright/test';

test('government portal reflows and notice search and categories navigate correctly', async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of ['/', '/tools', '/tools/image-converter', '/account/login', '/jobs']) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
    if (path === '/') await expect(page.locator('.classic-columns').getByRole('link', { name: 'Synthetic member opportunity', exact: true })).toBeVisible();
    if (path === '/tools') await expect(page.locator('.tool-card').first()).toBeVisible();
    if (path === '/tools/image-converter') await expect(page.getByLabel('Maximum width')).toBeVisible();
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} at ${width}`).toBe(true);
      if (width === 1440 || width === 390) await page.screenshot({ path: `test-results/redesign-${path.replaceAll('/', '_') || 'home'}-${width}.png`, fullPage: true });
    }
  }
  await page.goto('/');
  await page.getByRole('group', { name: 'Notice language', exact: true }).getByRole('radio', { name: 'Hindi', exact: true }).check();
  await expect(page.getByText('No published latest jobs in Hindi yet.', { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('group', { name: 'Notice language', exact: true }).getByRole('radio', { name: 'English', exact: true }).check();
  await page.getByRole('button', { name: 'Closing soon', exact: true }).click();
  await expect(page.getByText('No upcoming deadlines right now.', { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Refresh notices', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh notices', exact: true })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Search jobs and updates' }).fill('SSC');
  await page.getByRole('button', { name: 'Search notices', exact: true }).click();
  await expect(page).toHaveURL(/search\?q=SSC/);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Latest jobs', exact: true }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
});

test('drop validation and local resume review work without an account', async ({ page }) => {
  await page.goto('/tools/image-compressor');
  await page.locator('.file-drop').evaluate(node => {
    const data = new DataTransfer();
    data.items.add(new File(['invalid'], 'notes.txt', { type: 'text/plain' }));
    node.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: data }));
  });
  await expect(page.getByRole('alert')).toContainText('supported file');
  await expect(page.getByRole('button', { name: 'Compress image', exact: true })).toBeDisabled();
  await page.goto('/tools/resume-builder');
  await page.getByLabel('Full name').fill('Test Applicant');
  await page.getByLabel('projects', { exact: true }).fill('Accessible React application');
  await page.getByLabel('certifications', { exact: true }).fill('Cloud certification');
  await page.getByLabel('Job description', { exact: true }).fill('React TypeScript accessibility');
  await expect(page.locator('.resume-paper')).toContainText('Accessible React application');
  await expect(page.locator('.resume-keywords [role=status]')).toContainText('typescript');
  await page.getByRole('radio', { name: 'Arial', exact: true }).check();
  await page.getByRole('radio', { name: 'Compact', exact: true }).check();
  await expect(page.locator('.resume-paper')).toHaveCSS('font-family', 'Arial, sans-serif');
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.resume-keywords')).toBeHidden();
  await expect(page.locator('.product-faq')).toBeHidden();
  await expect(page.locator('.resume-paper')).toBeVisible();
});
