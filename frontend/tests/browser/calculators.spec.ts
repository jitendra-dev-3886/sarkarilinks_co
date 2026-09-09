import { test, expect } from '@playwright/test';
for (const slug of ['age', 'percentage', 'emi']) {
  test(`${slug} calculator produces results, clears stale values and fits mobile`, async ({ page }) => {
    await page.goto(`/tools/${slug}`);
    const workspace = page.locator('.calculator-workspace');
    await expect(workspace).toBeVisible();
    if (slug === 'age') {
      await page.getByLabel('Date of birth').fill('2000-09-20');
      await page.getByLabel('Cut-off date').fill('2026-09-19');
    } else if (slug === 'percentage') {
      await page.getByLabel('Marks obtained').fill('450');
      await page.getByLabel('Maximum marks').fill('500');
    } else {
      await page.getByLabel('Loan amount').fill('12000');
      await page.getByLabel('Annual interest rate').fill('0');
      await page.getByLabel('Number of monthly payments').fill('12');
    }
    await workspace.getByRole('button', { name: 'Calculate', exact: true }).click();
    await expect(workspace.locator('output')).toContainText(slug === 'age' ? '25 completed years' : slug === 'percentage' ? '90.00%' : '1,000.00 per month');
    for (const width of [1440, 768, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await workspace.getByRole('button', { name: 'Clear inputs' }).click();
    await expect(workspace.locator('output')).toBeEmpty();
    await expect(workspace.locator('input').first()).toHaveValue('');
  });
}
