import { test, expect, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
async function fixture(widths: number[]) {
  const doc = await PDFDocument.create();
  for (const width of widths) doc.addPage([width, 500]).drawText(`Certificate page ${width}`);
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}
async function downloaded(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  return readFile((await (await pending).path())!);
}
test('merge reorders real PDFs and extraction preserves selected page order locally', async ({ page }) => {
  const uploads: string[] = [];
  page.on('request', request => { if (['POST', 'PUT'].includes(request.method())) uploads.push(request.url()); });
  await page.goto('/tools/pdf-merge-split');
  await page.getByLabel('Choose PDF files').setInputFiles([{ name: 'first.pdf', mimeType: 'application/pdf', buffer: await fixture([300, 350]) }, { name: 'second.pdf', mimeType: 'application/pdf', buffer: await fixture([400]) }]);
  await page.getByRole('button', { name: 'Move file 2 up' }).click();
  await page.getByRole('button', { name: 'Merge PDFs', exact: true }).click();
  await expect(page.getByAltText('First page of processed PDF')).toBeVisible();
  const merged = await PDFDocument.load(await downloaded(page));
  expect(merged.getPages().map(p => p.getWidth())).toEqual([400, 300, 350]);
  await page.getByRole('radio', { name: 'Extract pages', exact: true }).check();
  await page.getByLabel('Choose PDF files').setInputFiles({ name: 'pages.pdf', mimeType: 'application/pdf', buffer: await fixture([300, 350, 400]) });
  await page.getByLabel('Pages to extract').fill('3, 1-2');
  await page.getByRole('button', { name: 'Extract pages', exact: true }).click();
  const extracted = await PDFDocument.load(await downloaded(page));
  expect(extracted.getPages().map(p => p.getWidth())).toEqual([400, 300, 350]);
  await page.getByLabel('Pages to extract').fill('99');
  await page.getByRole('button', { name: 'Extract pages', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('between 1 and 3');
  expect(uploads).toEqual([]);
});
test('PDF optimization returns a valid document no larger than its input', async ({ page }) => {
  const bytes = await fixture([300, 400]);
  await page.goto('/tools/pdf-compressor');
  await page.getByLabel('Choose PDF files').setInputFiles({ name: 'original.pdf', mimeType: 'application/pdf', buffer: bytes });
  await page.getByRole('button', { name: 'Compress PDF', exact: true }).click();
  const result = await downloaded(page);
  expect(result.length).toBeLessThanOrEqual(bytes.length);
  expect((await PDFDocument.load(result)).getPageCount()).toBe(2);
  await page.getByLabel('Choose PDF files').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') });
  await page.getByRole('button', { name: 'Compress PDF', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('damaged or password protected');
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
});
test('scanned PDF compression requires consent and produces a smaller PDF', async ({ page }) => {
  await page.goto('/tools/pdf-compressor');
  const png = await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 800;
    const ctx = canvas.getContext('2d')!; const data = ctx.createImageData(600, 800);
    let seed = 42;
    for (let i = 0; i < data.data.length; i += 4) { seed = (seed * 1664525 + 1013904223) >>> 0; data.data[i] = seed & 255; data.data[i + 1] = (seed >>> 8) & 255; data.data[i + 2] = (seed >>> 16) & 255; data.data[i + 3] = 255; }
    ctx.putImageData(data, 0, 0);
    return Array.from(new Uint8Array(await (await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!)))).arrayBuffer()));
  });
  const doc = await PDFDocument.create(), image = await doc.embedPng(new Uint8Array(png));
  doc.addPage([600, 800]).drawImage(image, { x: 0, y: 0, width: 600, height: 800 });
  const bytes = Buffer.from(await doc.save());
  await page.getByRole('radio', { name: 'Scanned PDF', exact: true }).check();
  await page.getByLabel('Choose PDF files').setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: bytes });
  await expect(page.getByRole('button', { name: 'Compress PDF', exact: true })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Compress PDF', exact: true }).click();
  const result = await downloaded(page);
  expect(result.length).toBeLessThan(bytes.length);
  expect((await PDFDocument.load(result)).getPageCount()).toBe(1);
  for (const width of [1440, 768, 320]) { await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
});
