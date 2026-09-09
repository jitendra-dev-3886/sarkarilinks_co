import { test, expect } from '@playwright/test';

test('single compact portal supports notices, responsive widths and language', async ({ page }) => {
  await page.goto('/?theme-preview=forest&layout-preview=theme');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'modern');
  await expect(page.locator('.compact-cards')).toBeVisible();
    await expect(page.locator('.classic-columns').getByRole('link', { name: 'Synthetic member opportunity', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh notices', exact: true })).toBeEnabled();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 1440 || width === 390) await page.screenshot({ path: `test-results/compact-cards-${width}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: 'Closing soon', exact: true }).click();
    await expect(page.getByText('No upcoming deadlines right now.', { exact: true })).toBeVisible();
    await page.getByRole('group', { name: 'Notice language', exact: true }).getByRole('radio', { name: 'Hindi', exact: true }).check();
    await expect(page.getByRole('navigation', { name: 'Notice categories' }).getByRole('link', { name: 'Admissions', exact: true })).toHaveAttribute('href', '/admissions?locale=hi');
});
