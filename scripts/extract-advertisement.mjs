import { readFile, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { suggestFields } from './advertisement-fields.mjs';

const require = createRequire(import.meta.url);
let worker, temporary, document, loadingTask;
const warnings = [];
const metadata = { pages: 0, ocr_pages: 0, languages: ['eng', 'hin'], warnings };
function reject(code) { throw Object.assign(new Error(code), { rejectionCode: code }); }
async function recognize(bytes) {
  if (!worker) {
    temporary = await mkdtemp(join(tmpdir(), 'sarkarilinks-ocr-'));
    for (const lang of ['eng', 'hin']) {
      await copyFile(join(require(`@tesseract.js-data/${lang}`).langPath, `${lang}.traineddata.gz`), join(temporary, `${lang}.traineddata.gz`));
    }
    worker = await createWorker(['eng', 'hin'], 1, { langPath: temporary, cacheMethod: 'none', logger: () => {} });
  }
  const { data } = await worker.recognize(bytes);
  if (data.confidence < 70) warnings.push(`Page ${metadata.pages}: low OCR confidence; compare carefully with the original.`);
  metadata.ocr_pages++;
  return data.text;
}

try {
  const file = await readFile(resolve(process.argv[2]));
  if (file.length > 10 * 1024 * 1024) reject('size_limit');
  const sections = [];
  if (file.subarray(0, 5).toString() === '%PDF-') {
    const pdfRoot = resolve(import.meta.dirname, '../node_modules/pdfjs-dist');
    loadingTask = getDocument({ data: new Uint8Array(file), isEvalSupported: false, useSystemFonts: false, verbosity: 0,
      cMapUrl: `${pdfRoot}/cmaps/`, cMapPacked: true, standardFontDataUrl: `${pdfRoot}/standard_fonts/`, wasmUrl: `${pdfRoot}/wasm/` });
    document = await loadingTask.promise;
    if (document.numPages > 50) reject('page_limit');
    if (await document.hasJSActions()) reject('pdf_scripts');
    const attachments = await document.getAttachments();
    if (attachments?.size) reject('pdf_attachments');
    for (let index = 1; index <= document.numPages; index++) {
      metadata.pages++;
      const page = await document.getPage(index);
      const actions = await page.getJSActions();
      if (actions?.size) reject('pdf_scripts');
      const annotations = await page.getAnnotations();
      if (annotations.some(annotation => annotation.file)) reject('pdf_attachments');
      const content = await page.getTextContent();
      let text = content.items.map(item => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join('').trim();
      // Mixed scanned/text pages also receive OCR; header-only text must not hide the notice.
      const operators = await page.getOperatorList();
      const { OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const hasImages = operators.fnArray.some(op => [OPS.paintImageXObject, OPS.paintInlineImageXObject].includes(op));
      if (text.length < 80 || hasImages) {
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(2, Math.sqrt(12000000 / (base.width * base.height)));
        const viewport = page.getViewport({ scale });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const ocr = await recognize(canvas.toBuffer('image/png'));
        text = ocr.trim().length >= text.length ? ocr : text;
      }
      sections.push(text);
      page.cleanup();
      if (sections.join('\n').length > 100000) reject('text_limit');
    }
  } else {
    const image = await loadImage(file);
    if (image.width * image.height > 20000000) reject('pixel_limit');
    metadata.pages = 1;
    sections.push(await recognize(file));
  }
  const text = sections.join('\n\n').replace(/\u0000/g, '').trim();
  if (text.length < 20) reject('unreadable');
  if (text.length > 100000) reject('text_limit');
  const suggestions = suggestFields(text);
  if (!suggestions.type) warnings.push('The section is uncertain. Select the correct category before creating a draft.');
  process.stdout.write(JSON.stringify({ text, suggestions, metadata }));
} catch (error) {
  const code = error.rejectionCode ?? (error.name === 'PasswordException' ? 'pdf_password' : error.name === 'InvalidPDFException' ? 'invalid_pdf' : null);
  if (code) {
    process.stdout.write(JSON.stringify({ error: { code } }));
    process.exitCode = 2;
  } else {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
} finally {
  await worker?.terminate();
  await loadingTask?.destroy();
  if (temporary && dirname(resolve(temporary)) === resolve(tmpdir()) && basename(temporary).startsWith('sarkarilinks-ocr-')) await rm(temporary, { recursive: true, force: true });
}
