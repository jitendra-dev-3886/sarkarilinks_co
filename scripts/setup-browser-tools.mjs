import { mkdir, cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modules = path.join(root, 'frontend/node_modules');
const target = path.join(root, 'frontend/public/tool-assets');
await mkdir(target, { recursive: true });
await mkdir(path.join(target, 'tesseract'), { recursive: true });
await cp(path.join(modules, 'tesseract.js/dist/worker.min.js'), path.join(target, 'tesseract/worker.min.js'));
for (const name of await readdir(path.join(modules, 'tesseract.js-core'))) {
  if (/\.(wasm|js)$/.test(name)) await cp(path.join(modules, 'tesseract.js-core', name), path.join(target, 'tesseract', name));
}
await mkdir(path.join(target, 'lang'), { recursive: true });
for (const lang of ['eng', 'hin']) await cp(path.join(root, `node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`), path.join(target, `lang/${lang}.traineddata.gz`));
await mkdir(path.join(target, 'onnx'), { recursive: true });
for (const name of await readdir(path.join(modules, 'onnxruntime-web/dist'))) {
  if (/^ort-wasm.*\.(wasm|mjs)$/.test(name)) await cp(path.join(modules, 'onnxruntime-web/dist', name), path.join(target, 'onnx', name));
}
const model = path.join(target, 'modnet.onnx');
const checksum = '07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9';
const valid = data => createHash('sha256').update(data).digest('hex') === checksum;
let installed = false;
try { installed = valid(await readFile(model)); } catch { /* First installation. */ }
if (!installed) {
  console.log('Downloading Apache-2.0 MODNet portrait model...');
  const response = await fetch('https://huggingface.co/Xenova/modnet/resolve/main/onnx/model.onnx');
  if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!valid(bytes)) throw new Error('MODNet checksum changed. Review the upstream model before updating this script.');
  await writeFile(model, bytes);
}
console.log('Browser tools ready: OCR, PDF and portrait matting run on this origin.');
