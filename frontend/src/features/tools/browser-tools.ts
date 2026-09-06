export const maxBytes = 10 * 1024 * 1024;
export async function readImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > maxBytes) throw new Error('Choose a JPG, PNG or WebP image up to 10 MB.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('This image could not be opened. Try exporting it as a plain JPG or PNG.'); });
  if (bitmap.width * bitmap.height > 20_000_000) { bitmap.close(); throw new Error('Choose an image up to 20 megapixels.'); }
  return bitmap;
}
export function canvas(width: number, height: number) { const node = document.createElement('canvas'); node.width = width; node.height = height; return node; }
export function toBlob(node: HTMLCanvasElement, type = 'image/png', quality = 0.85): Promise<Blob> { return new Promise((resolve, reject) => node.toBlob(blob => blob ? resolve(blob) : reject(new Error('Your browser could not export this format.')), type, quality)); }
export function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000); }
export function size(bytes: number) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`; }

export async function extractText(file: File, progress: (value: string) => void): Promise<string> {
  if (file.size > maxBytes) throw new Error('Choose a file up to 10 MB.');
  const { createWorker } = await import('tesseract.js');
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  async function recognize(source: HTMLCanvasElement | File) {
    worker ??= await createWorker(['eng', 'hin'], 1, { workerPath: '/tool-assets/tesseract/worker.min.js', corePath: '/tool-assets/tesseract', langPath: '/tool-assets/lang', logger: message => progress(`${message.status} ${Math.round(message.progress * 100)}%`) });
    return (await worker.recognize(source)).data.text;
  }
  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const pdfjs = await import('pdfjs-dist');
      const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;
      const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      loading.onPassword = () => { void loading.destroy(); };
      const pdf = await loading.promise;
      try {
        if (pdf.numPages > 10) throw new Error('This tool accepts PDFs up to 10 pages.');
        const pages: string[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          progress(`Reading page ${pageNumber} of ${pdf.numPages}`);
          const page = await pdf.getPage(pageNumber), content = await page.getTextContent();
          let value = content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('');
          if (value.trim().length < 40) {
            const base = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({ scale: Math.min(2, Math.sqrt(4_000_000 / (base.width * base.height))) });
            const node = canvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
            await page.render({ canvas: node, viewport }).promise;
            value = await recognize(node);
            node.width = node.height = 0;
          }
          pages.push(value.trim()); page.cleanup();
        }
        return pages.join('\n\n');
      } finally { await loading.destroy(); }
    }
    const bitmap = await readImage(file); bitmap.close();
    return await recognize(file);
  } finally { await worker?.terminate(); }
}

export async function removeBackground(file: File, progress: (value: string) => void) {
  const bitmap = await readImage(file);
  let session: import('onnxruntime-web').InferenceSession | undefined;
  try {
    progress('Loading the portrait model. The first run can take a moment.');
    const ort = await import('onnxruntime-web/wasm');
    // Keep the JS factory bundled by Vite; only the binary uses a static URL.
    ort.env.wasm.wasmPaths = { wasm: '/tool-assets/onnx/ort-wasm-simd-threaded.wasm' }; ort.env.wasm.numThreads = 1;
    session = await ort.InferenceSession.create('/tool-assets/modnet.onnx', { executionProviders: ['wasm'] });
    const input = canvas(512, 512), ctx = input.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, 512, 512);
    const rgba = ctx.getImageData(0, 0, 512, 512).data, pixels = 512 * 512, rgb = new Float32Array(pixels * 3);
    for (let i = 0; i < pixels; i++) for (let channel = 0; channel < 3; channel++) rgb[channel * pixels + i] = rgba[i * 4 + channel] / 127.5 - 1;
    progress('Separating the portrait from its background...');
    const result = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', rgb, [1, 3, 512, 512]) });
    const matte = result[session.outputNames[0]], values = matte.data as Float32Array;
    const mask = ctx.createImageData(512, 512);
    for (let i = 0; i < pixels; i++) { mask.data[i * 4] = 255; mask.data[i * 4 + 1] = 255; mask.data[i * 4 + 2] = 255; mask.data[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, values[i])) * 255); }
    ctx.putImageData(mask, 0, 0);
    const output = canvas(bitmap.width, bitmap.height), out = output.getContext('2d')!;
    out.drawImage(bitmap, 0, 0); out.globalCompositeOperation = 'destination-in'; out.drawImage(input, 0, 0, output.width, output.height);
    const blob = await toBlob(output); output.width = output.height = 0;
    for (const tensor of Object.values(result)) tensor.dispose();
    return blob;
  } finally { bitmap.close(); await session?.release(); }
}
