import { PDFDocument } from 'pdf-lib';
import { canvas, toBlob } from './browser-tools';
export const PDF_LIMIT = 10 * 1024 * 1024;
export async function openPdf(file: File) {
  if (!file.name.toLowerCase().endsWith('.pdf') || file.size === 0 || file.size > PDF_LIMIT) throw new Error('Choose a PDF up to 10 MB.');
  let doc: PDFDocument;
  try { doc = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false }); }
  catch { throw new Error(`${file.name}: this PDF is damaged or password protected. Export an unlocked copy first.`); }
  if (doc.getPageCount() < 1 || doc.getPageCount() > 50) throw new Error('Choose PDFs with 1 to 50 pages.');
  if (doc.getForm().getFields().length) throw new Error('Interactive forms and signature fields are not supported. Use a plain, unsigned PDF.');
  return doc;
}
export function pageSelection(value: string, count: number): number[] {
  if (!value.trim()) return Array.from({ length: count }, (_, i) => i);
  const result: number[] = [];
  for (const part of value.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Use page numbers or ranges, for example 1, 3-5.');
    const start = Number(match[1]), end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start || end > count) throw new Error(`Page ranges must be between 1 and ${count}, in ascending order.`);
    for (let n = start; n <= end; n++) if (!result.includes(n - 1)) result.push(n - 1);
  }
  return result;
}
export async function renderPdf(bytes: Uint8Array) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const loading = pdfjs.getDocument({ data: bytes });
  loading.onPassword = () => { void loading.destroy(); };
  try { return { pdf: await loading.promise, destroy: () => loading.destroy() }; }
  catch { await loading.destroy(); throw new Error('This PDF could not be previewed. Try a plain, unlocked PDF.'); }
}
export async function pdfPreview(blob: Blob) {
  const source = await renderPdf(new Uint8Array(await blob.arrayBuffer()));
  try {
    const page = await source.pdf.getPage(1), base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(1, 600 / base.width, 800 / base.height) });
    const node = canvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    try { await page.render({ canvas: node, viewport }).promise; return await toBlob(node); }
    finally { node.width = node.height = 0; page.cleanup(); }
  } finally { await source.destroy(); }
}
export async function compressPdf(file: File, mode: string, progress: (value: number, label: string) => void) {
  const original = await openPdf(file);
  if (mode === 'optimize') {
    progress(40, 'Optimizing document structure');
    const bytes = await original.save({ useObjectStreams: true });
    progress(100, 'Optimization complete');
    return { blob: bytes.length < file.size ? new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }) : file, pages: original.getPageCount(), unchanged: bytes.length >= file.size };
  }
  const source = await renderPdf(new Uint8Array(await file.arrayBuffer()));
  try {
    const output = await PDFDocument.create();
    for (let i = 1; i <= source.pdf.numPages; i++) {
      progress(Math.round((i - 1) / source.pdf.numPages * 90), `Compressing page ${i} of ${source.pdf.numPages}`);
      const page = await source.pdf.getPage(i), base = page.getViewport({ scale: 1 });
      const scale = Math.min(1.5, Math.sqrt(3_000_000 / (base.width * base.height)));
      const viewport = page.getViewport({ scale });
      const node = canvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      try {
        await page.render({ canvas: node, viewport, background: '#ffffff' }).promise;
        const jpg = await toBlob(node, 'image/jpeg', .65);
        const image = await output.embedJpg(await jpg.arrayBuffer());
        output.addPage([base.width, base.height]).drawImage(image, { x: 0, y: 0, width: base.width, height: base.height });
      } finally { node.width = node.height = 0; page.cleanup(); }
    }
    const bytes = await output.save();
    progress(100, 'Compression complete');
    return { blob: bytes.length < file.size ? new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }) : file, pages: original.getPageCount(), unchanged: bytes.length >= file.size };
  } finally { await source.destroy(); }
}
export async function organizePdf(files: File[], mode: string, selection: string, progress: (value: number, label: string) => void) {
  const output = await PDFDocument.create();
  let total = 0;
  for (let i = 0; i < files.length; i++) {
    const source = await openPdf(files[i]);
    const indices = mode === 'extract' ? pageSelection(selection, source.getPageCount()) : source.getPageIndices();
    total += indices.length;
    if (total > 50) throw new Error('The output may contain at most 50 pages.');
    for (const page of await output.copyPages(source, indices)) output.addPage(page);
    progress(Math.round((i + 1) / files.length * 90), `Processed ${i + 1} of ${files.length} files`);
  }
  return { blob: new Blob([new Uint8Array(await output.save())], { type: 'application/pdf' }), pages: total, unchanged: false };
}
