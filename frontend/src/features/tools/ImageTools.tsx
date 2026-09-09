import ChoiceSwitch from '../../components/ChoiceSwitch';
import { useEffect, useState, type FormEvent } from 'react';
import { maxBytes, canvas, download, extractText, readImage, removeBackground, size, toBlob } from './browser-tools';

export default function ImageTools({ slug }: { slug: string }) {
  const [file, setFile] = useState<File>(), [format, setFormat] = useState('image/jpeg'), [quality, setQuality] = useState(80);
  const [result, setResult] = useState<Blob>(), [preview, setPreview] = useState(''), [text, setText] = useState(''), [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  function chooseFile(next?: File) {
    setResult(undefined); setText(''); setStatus(''); setError('');
    if (next && (next.size > maxBytes || !['image/jpeg', 'image/png', 'image/webp', ...(ocr ? ['application/pdf'] : [])].includes(next.type))) { setFile(undefined); setError('Choose a supported file up to 10 MB.'); return; }
    setFile(next);
  }
  const ocr = slug === 'image-to-text', pdf = slug === 'image-to-pdf', background = slug === 'background-remover';
  useEffect(() => { if (!result || result.type === 'application/pdf') { setPreview(''); return; } const url = URL.createObjectURL(result); setPreview(url); return () => URL.revokeObjectURL(url); }, [result]);
  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file) return;
    const data = new FormData(event.currentTarget); setBusy(true); setError(''); setResult(undefined); setText(''); setStatus('Preparing your file...');
    try {
      if (ocr) { const value = await extractText(file, setStatus); if (!value.trim()) throw new Error('No readable text found. Try a clearer image.'); setText(value); }
      else if (background) setResult(await removeBackground(file, setStatus));
      else {
        const bitmap = await readImage(file);
        try {
          const width = Math.min(Number(data.get('width')) || bitmap.width, bitmap.width), height = Math.max(1, Math.round(bitmap.height * width / bitmap.width));
          const node = canvas(width, height), ctx = node.getContext('2d')!;
          if (format === 'image/jpeg' || pdf) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }
          ctx.drawImage(bitmap, 0, 0, width, height);
          const blob = await toBlob(node, pdf ? 'image/jpeg' : format, quality / 100);
          if (pdf) {
            const { PDFDocument } = await import('pdf-lib'), document = await PDFDocument.create();
            const image = await document.embedJpg(await blob.arrayBuffer()), page = document.addPage([595.28, 841.89]);
            const scale = Math.min(547 / width, 794 / height); page.drawImage(image, { x: (595.28 - width * scale) / 2, y: (841.89 - height * scale) / 2, width: width * scale, height: height * scale });
            setResult(new Blob([new Uint8Array(await document.save())], { type: 'application/pdf' }));
          } else setResult(blob);
          node.width = node.height = 0;
        } finally { bitmap.close(); }
      }
      setStatus('Done. Your file was processed on this device.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Processing failed. Try another file.'); setStatus(''); }
    finally { setBusy(false); }
  }
  return <div className="tool-workspace"><form className="panel tool-controls" onSubmit={run}><div className="tool-panel-heading"><span className="tool-step" aria-hidden="true">01</span><div><h2>Upload &amp; settings</h2><p>Choose a file and prepare your output.</p></div></div><label className={`file-drop ${dragging ? 'is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); if (!busy) { if (event.dataTransfer.files.length !== 1) { setError('Choose one file at a time.'); return; } chooseFile(event.dataTransfer.files[0]); } }}><span className="upload-symbol" aria-hidden="true">↑</span><strong>Drop or choose your {ocr ? 'document' : 'image'}</strong><span>{ocr ? 'PDF, JPG, PNG or WebP · PDF: 10 pages' : 'JPG, PNG or WebP'}<br />Up to 10 MB · Images: 20 megapixels</span><input aria-label="Choose file" type="file" accept={ocr ? '.pdf,.jpg,.jpeg,.png,.webp' : '.jpg,.jpeg,.png,.webp'} disabled={busy} onChange={e => chooseFile(e.target.files?.[0])} /></label>{file && <p className="file-name">{file.name} <small>{size(file.size)}</small></p>}{!ocr && !background && !pdf && <><ChoiceSwitch label="Output format" value={format} disabled={busy} onChange={value => { setFormat(value); setResult(undefined); }} options={[["image/jpeg", "JPG"], ["image/png", "PNG (lossless)"], ["image/webp", "WebP"]]} />{format !== 'image/png' && <label>Quality: {quality}%<input type="range" min="10" max="100" value={quality} onChange={e => { setQuality(Number(e.target.value)); setResult(undefined); }} disabled={busy} /></label>}<label>Maximum width (pixels)<input name="width" type="number" min="1" max="20000" placeholder="Keep original size" disabled={busy} onChange={() => setResult(undefined)} /></label><small>Aspect ratio is preserved. JPG uses a white background. Lower quality or width for smaller files.</small></>}{background && <p>Best for clear photos of people. Fine hair and busy backgrounds may need retouching. The first run loads a 25 MB model.</p>}<button disabled={busy || !file}>{busy ? 'Processing...' : ocr ? 'Extract text' : background ? 'Remove background' : pdf ? 'Create PDF' : slug === 'image-compressor' ? 'Compress image' : 'Convert image'}</button></form><section className="panel tool-output" aria-label="Processing result" aria-busy={busy}><div className="tool-panel-heading"><span className="tool-step" aria-hidden="true">02</span><div><h2>Preview &amp; download</h2><p>Review the result before saving.</p></div></div>{!result && !text && !busy && !error && <div className="tool-empty"><span aria-hidden="true">✦</span><h2>Your result appears here</h2><p>Your result will appear here, ready to download.</p><small>Private by design. Your file stays on your device.</small></div>}{busy && <div className="processing-orbit" aria-hidden="true" />}{status && <p role="status">{status}</p>}{error && <p className="admin-error" role="alert">{error}</p>}{result && <><h2>Your file is ready</h2>{preview && <div className="image-preview"><img src={preview} alt="Processed image preview" /></div>}<p>{file && `Original ${size(file.size)} → `}{size(result.size)}{file && !pdf && (result.size < file.size ? ` · ${Math.round((1 - result.size / file.size) * 100)}% smaller` : ' · This output is not smaller; reduce quality or width if needed.')}</p><button onClick={() => download(result, `${file?.name.replace(/\.[^.]+$/, '') || 'image'}-processed.${result.type === 'application/pdf' ? 'pdf' : result.type === 'image/jpeg' ? 'jpg' : result.type.split('/')[1]}`)}>Download {pdf ? 'PDF' : 'image'}</button></>}{text && <><label>Extracted text<textarea className="ocr-result" value={text} onChange={e => setText(e.target.value)} rows={15} /></label><p>Review names, numbers and formatting before using OCR text.</p><button onClick={() => download(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'extracted-text.txt')}>Download text</button></>}</section></div>;
}
