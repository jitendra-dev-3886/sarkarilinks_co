import { test, expect } from '@playwright/test';

test('mobile app navigation follows routes and stays accessible on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  await navigation.getByRole('link', { name: 'Tools', exact: true }).click();
  await expect(page).toHaveURL(/\/tools$/);
  await expect(navigation.getByRole('link', { name: 'Tools', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goto('/tools/pdf-compressor');
  await expect(navigation.getByRole('link', { name: 'Tools', exact: true })).toHaveAttribute('aria-current', 'page');
  for (const width of [320, 390, 600]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await navigation.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(845);
  }
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link', { name: 'Results', exact: true }).click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(navigation).toBeHidden();
});
