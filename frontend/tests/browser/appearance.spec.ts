import { test, expect, type Page } from '@playwright/test';

async function admin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('administrator@example.test');
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Homepage appearance', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Homepage appearance', exact: true })).toBeVisible();
}

test('classic notice board previews, saves independently of palette and opens real category links', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await admin(page);
  await page.getByRole('radio', { name: 'Forest', exact: true }).check();
  await page.getByLabel('Homepage structure').selectOption('classic');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Preview homepage' }).click();
  const preview = await popupPromise;
  await expect(preview.locator('.classic-home')).toBeVisible();
  await expect(preview.getByText(/Preview only:/)).toBeVisible();
  await preview.close();
  const guest = await browser.newContext(), visitor = await guest.newPage();
  try {
    await visitor.goto('http://127.0.0.1:5175/');
    await expect(visitor.locator('.classic-home')).toHaveCount(0);
    await page.getByRole('button', { name: 'Apply design to website' }).click();
    await expect(page.getByText('Design saved for all visitors.', { exact: false })).toBeVisible();
    await visitor.reload();
    await expect(visitor.locator('html')).toHaveAttribute('data-theme', 'forest');
    await expect(visitor.locator('.classic-home')).toBeVisible();
    await expect(visitor.locator('.classic-columns').getByRole('link', { name: 'Synthetic member opportunity', exact: true })).toBeVisible();
    await expect(visitor.locator('.classic-column')).toHaveCount(9);
    await expect(visitor.getByRole('button', { name: 'Refresh notices', exact: true })).toBeEnabled();
    await expect(visitor.locator('.classic-columns').getByRole('alert')).toHaveCount(0);
    for (const width of [1440, 390, 320]) {
      await visitor.setViewportSize({ width, height: 900 });
      expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 1440) {
        const columns = visitor.locator('.classic-column');
        const first = (await columns.nth(0).boundingBox())!, third = (await columns.nth(2).boundingBox())!;
        expect(third.x).toBeGreaterThan(first.x + first.width);
        expect(third.y).toBe(first.y);
      }
      await visitor.screenshot({ path: `test-results/classic-${width}.png`, fullPage: true });
    }
    await page.getByLabel('Classic homepage banner').selectOption('classic-quick');
    const quickPreviewPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Preview homepage' }).click();
    const quickPreview = await quickPreviewPromise;
    await expect(quickPreview.getByRole('heading', { name: 'What would you like to do today?' })).toBeVisible();
    const arrangements = new Set<string>();
    for (const theme of ['ocean', 'forest', 'studio', 'editorial', 'focus']) {
      await quickPreview.goto(`/?theme-preview=${theme}&layout-preview=classic-quick`);
      await expect(quickPreview.locator('html')).toHaveAttribute('data-theme', theme);
      await quickPreview.setViewportSize({ width: 1440, height: 900 });
      await expect(quickPreview.locator('.quick-start-actions a')).toHaveCount(4);
      arrangements.add(await quickPreview.locator('.classic-quick-start').evaluate(node => {
        const banner = getComputedStyle(node), actions = getComputedStyle(node.querySelector('.quick-start-actions')!), card = getComputedStyle(node.querySelector('.quick-start-actions a')!);
        return [banner.gridTemplateColumns, actions.gridTemplateColumns, card.display, card.backgroundColor].join('|');
      }));
      for (const width of [1440, 320]) {
        await quickPreview.setViewportSize({ width, height: 900 });
        expect(await quickPreview.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await quickPreview.locator('.classic-quick-start').screenshot({ path: `test-results/quick-${theme}-${width}.png` });
      }
    }
    expect(arrangements.size).toBe(5);
    await quickPreview.close();
    await visitor.reload();
    await expect(visitor.locator('.classic-masthead')).toBeVisible();
    await page.getByRole('button', { name: 'Apply design to website' }).click();
    await expect(page.getByText('Design saved for all visitors.', { exact: false })).toBeVisible();
    await visitor.reload();
    await expect(visitor.locator('.classic-quick-start')).toBeVisible();
    await expect(visitor.locator('.classic-masthead')).toHaveCount(0);
    await expect(visitor.getByRole('navigation', { name: 'Start a task' }).getByRole('link', { name: /Open my shortlist/ })).toHaveAttribute('href', '/account?tab=saved');
    await expect(visitor.locator('.classic-column')).toHaveCount(9);
    expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await visitor.screenshot({ path: 'test-results/classic-quick-320.png', fullPage: true });
    await visitor.getByRole('button', { name: 'Closing soon', exact: true }).click();
    await expect(visitor.getByText('No upcoming deadlines right now.', { exact: true })).toBeVisible();
    await visitor.getByLabel('Notice language').selectOption('hi');
    await expect(visitor.getByRole('navigation', { name: 'Notice categories' }).getByRole('link', { name: 'Admissions', exact: true })).toHaveAttribute('href', '/admissions?locale=hi');
    await visitor.getByRole('navigation', { name: 'Notice categories' }).getByRole('link', { name: 'Admissions', exact: true }).click();
    await expect(visitor).toHaveURL(/\/admissions\?locale=hi$/);
  } finally {
    await guest.close();
    await page.getByLabel('Homepage structure').selectOption('theme');
    await page.getByRole('radio', { name: 'Ocean', exact: true }).check();
    await page.getByRole('button', { name: 'Apply design to website' }).click();
    await expect(page.getByText('Design saved for all visitors.', { exact: false })).toBeVisible();
  }
});

test('administrator can preview and publish all five designs; visitors see the saved selection', async ({ page, browser }) => {
  test.setTimeout(240_000);
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
        const home = getComputedStyle(document.querySelector('.task-home')!);
        const pairs = [['--ink','--page'],['--muted','--page'],['--teal','--soft-alt'],['--blue','white']].map(([fg,bg]) => [style.getPropertyValue(fg), bg === 'white' ? '#ffffff' : style.getPropertyValue(bg)]);
        for (const background of ['--home-night', '--home-night-end']) for (const foreground of ['--home-bright', '--home-light-text']) pairs.push([home.getPropertyValue(foreground), home.getPropertyValue(background)]);
        return pairs.map(([fg,bg]) => { const a = luminance(fg), b = luminance(bg); return (Math.max(a,b) + .05) / (Math.min(a,b) + .05); });
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
        if (width === 1440) {
          const copy = (await visitor.locator('.hero-copy').boundingBox())!;
          const shortcuts = (await visitor.getByRole('navigation', { name: 'Quick access', exact: true }).boundingBox())!;
          const jobs = (await visitor.locator('.task-jobs').boundingBox())!;
          const board = (await visitor.locator('.home-notice-board').boundingBox())!;
          if (theme === 'ocean') expect(shortcuts.x).toBeGreaterThan(copy.x + copy.width);
          if (theme === 'forest') { expect(board.x).toBeGreaterThan(jobs.x + jobs.width); expect(Math.abs(board.y - jobs.y)).toBeLessThan(2); }
          if (theme === 'studio') expect(await visitor.locator('.hero-copy').evaluate(node => getComputedStyle(node).textAlign)).toBe('center');
          if (theme === 'editorial') expect(await visitor.locator('.home-job').first().evaluate(node => getComputedStyle(node).borderRadius)).toBe('0px');
          if (theme === 'focus') { expect(jobs.width).toBeLessThanOrEqual(960); const columns = await visitor.locator('.notice-column').all(); const a = (await columns[0].boundingBox())!, b = (await columns[1].boundingBox())!; expect(b.y).toBeGreaterThan(a.y); expect(b.x).toBe(a.x); }
        }
        if (width !== 320) await visitor.screenshot({ path: `test-results/theme-${theme}-${width}.png`, fullPage: true });
      }
      for (const [route, heading] of [['/jobs', '.page-intro'], ['/tools', '.tools-hero'], ['/tools/image-converter', '.tool-detail-heading'], ['/account/login', '.auth-story']]) {
        await visitor.goto(`http://127.0.0.1:5175${route}`);
        await expect(visitor.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(visitor.locator(heading)).toBeVisible();
        expect(await visitor.locator(heading).evaluate(node => getComputedStyle(node).backgroundImage)).toContain('linear-gradient');
        expect(await visitor.locator(`${heading} h1`).evaluate(node => getComputedStyle(node).color)).toBe('rgb(255, 255, 255)');
        expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (theme === 'studio' && route === '/tools') await visitor.screenshot({ path: 'test-results/inner-studio-tools-320.png', fullPage: true });
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
