import { test, expect, type Page } from '@playwright/test';

async function admin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('administrator@example.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Homepage appearance', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Homepage appearance', exact: true })).toBeVisible();
}

test('administrator can preview and publish all five designs; visitors see the saved selection', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await admin(page);
  const guest = await browser.newContext(), visitor = await guest.newPage();
  try {
    for (const [theme, name] of [['forest','Forest'], ['studio','Studio'], ['editorial','Editorial'], ['focus','Focus'], ['ocean','Ocean']]) {
      await page.getByRole('radio', { name, exact: true }).check();
      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('link', { name: 'Preview homepage' }).click();
      const preview = await popupPromise;
      await expect(preview.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(preview.getByText(/Preview only:/)).toBeVisible();
      await preview.close();
      await page.getByRole('button', { name: 'Apply design to website' }).click();
      await expect(page.getByText('Design saved for all visitors.', { exact: false })).toBeVisible();
      await visitor.goto('http://127.0.0.1:5175/');
      await expect(visitor.locator('html')).toHaveAttribute('data-theme', theme);
      const ratios = await visitor.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        const rgb = (value: string) => value.trim().replace('#','').match(/../g)!.map(part => parseInt(part,16));
        const luminance = (value: string) => rgb(value).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i],0);
        return [['--ink','--page'],['--muted','--page'],['--teal','--soft-alt'],['--blue','white']].map(([fg,bg]) => { const a = luminance(style.getPropertyValue(fg)), b = luminance(bg === 'white' ? '#ffffff' : style.getPropertyValue(bg)); return (Math.max(a,b) + .05) / (Math.min(a,b) + .05); });
      });
      for (const ratio of ratios) expect(ratio, `${name}: normal text contrast`).toBeGreaterThanOrEqual(4.5);
      await expect(visitor.getByRole('heading', { name: 'Find your opportunity. Make your next move.' })).toBeVisible();
      await expect(visitor.getByRole('heading', { name: 'Synthetic member opportunity', exact: true })).toBeVisible();
      for (const width of [1440, 390, 320]) {
        await visitor.setViewportSize({ width, height: 900 });
        expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const styles = await visitor.locator('.hero-copy > p').evaluate(node => ({ size: parseFloat(getComputedStyle(node).fontSize), lineHeight: parseFloat(getComputedStyle(node).lineHeight) }));
        expect(styles.size).toBeGreaterThanOrEqual(16);
        expect(styles.lineHeight / styles.size).toBeGreaterThanOrEqual(1.5);
        if (width !== 320) await visitor.screenshot({ path: `test-results/theme-${theme}-${width}.png`, fullPage: true });
      }
    }
    await visitor.goto('http://127.0.0.1:5175/?theme-preview=studio');
    await expect(visitor.locator('html')).toHaveAttribute('data-theme', 'ocean');
    await expect(visitor.getByText(/Preview only:/)).toHaveCount(0);
    const denied = await visitor.request.put('http://127.0.0.1:5175/api/v1/admin/appearance', { data: { theme: 'focus', text_size: 'standard', version: 1 } });
    expect([401, 419]).toContain(denied.status());
  } finally { await guest.close(); }
});

test('large reading size, reflow and form labels stay usable', async ({ page }) => {
  await admin(page);
  await page.getByRole('combobox', { name: /Reading size/ }).selectOption('large');
  await page.getByRole('button', { name: 'Apply design to website' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
  await page.goto('/tools/image-converter');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByLabel('Maximum width').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(18);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/');
  // 200% text scaling and WCAG text-spacing overrides, without fixed-height clipping.
  await page.route('**/reading-test.css', route => route.fulfill({ contentType: 'text/css', body: 'html {font-size:200% !important} p {line-height:1.5 !important;margin-bottom:2em !important} * {letter-spacing:.12em !important;word-spacing:.16em !important}' }));
  await page.addStyleTag({ url: '/reading-test.css' });
  expect(await page.locator('html').evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBe(32);
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/admin?tab=appearance');
  await page.getByRole('combobox', { name: /Reading size/ }).selectOption('standard');
  await page.getByRole('button', { name: 'Apply design to website' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'standard');
});

test('returning guests can reopen or clear recent tools without storing document inputs', async ({ page }) => {
  await page.goto('/tools/age');
  await page.getByLabel('Date of birth').fill('2001-02-03');
  await page.goto('/tools/image-converter');
  await page.getByLabel('Maximum width').fill('999');
  await page.goto('/');
  const recent = page.locator('.recent-tools');
  await expect(page.getByRole('heading', { name: 'Pick up where you left off' })).toBeVisible();
  await expect(page.locator('.hero-workspace')).toBeHidden();
  await expect(recent.getByRole('link', { name: /Image converter/ })).toBeVisible();
  await expect(recent.getByRole('link', { name: /Age Calculator/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sarkarilinks.recent-tools.v1'))).toBe('["image-converter","age"]');
  await page.reload();
  await expect(recent.getByRole('link', { name: /Image converter/ })).toBeVisible();
  await recent.getByRole('button', { name: 'Clear recent tools' }).click();
  await expect(recent).toHaveCount(0);
  await page.getByRole('button', { name: 'Closing soon', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Closing soon', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'No upcoming deadlines right now' })).toBeVisible();
});
