import { useEffect, useRef, useState, type FormEvent } from 'react';
import ChoiceSwitch from '../../components/ChoiceSwitch';
import { download, size } from './browser-tools';
import { compressPdf, organizePdf, pdfPreview, PDF_LIMIT } from './pdf-processing';
interface Result { blob: Blob; pages: number; unchanged: boolean; }
export default function PdfTools({ slug }: { slug: string }) {
  const compress = slug === 'pdf-compressor';
  const [files, setFiles] = useState<File[]>([]), [mode, setMode] = useState(compress ? 'optimize' : 'merge');
  const [range, setRange] = useState(''), [acknowledged, setAcknowledged] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [progress, setProgress] = useState(0), [status, setStatus] = useState('');
  const [result, setResult] = useState<Result>(), [preview, setPreview] = useState(''), [previewError, setPreviewError] = useState('');
  const dragged = useRef<number | null>(null), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!result) { setPreview(''); return; } let active = true, url = ''; setPreviewError('');
    void pdfPreview(result.blob).then(blob => { if (active) { url = URL.createObjectURL(blob); setPreview(url); } }).catch(() => { if (active) setPreviewError('Preview unavailable. You can still download the PDF.'); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [result]);
  function clearResult() { setResult(undefined); setError(''); setStatus(''); setProgress(0); setPreviewError(''); }
  function choose(incoming: File[]) {
    if (!incoming.length || busy) return;
    clearResult();
    const next = compress || mode === 'extract' ? incoming : [...files, ...incoming];
    if ((compress || mode === 'extract') && next.length !== 1) { setError('Choose one PDF for this operation.'); return; }
    if (next.length > 10 || next.reduce((sum, file) => sum + file.size, 0) > 30 * 1024 * 1024) { setError('Choose up to 10 files, totaling no more than 30 MB.'); return; }
    if (next.some(file => !file.name.toLowerCase().endsWith('.pdf') || file.size === 0 || file.size > PDF_LIMIT)) { setError('Choose non-empty PDF files up to 10 MB each.'); return; }
    setFiles(next);
  }
  function move(from: number, to: number) { if (busy || to < 0 || to >= files.length) return; clearResult(); setFiles(current => { const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }); }
  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !files.length) return;
    clearResult(); setBusy(true);
    const update = (value: number, label: string) => { if (mounted.current) { setProgress(value); setStatus(label); } };
    try {
      const output = compress ? await compressPdf(files[0], mode, update) : await organizePdf(files, mode, range, update);
      if (mounted.current) { setResult(output); setProgress(100); setStatus('Your PDF is ready.'); }
    } catch (caught) { if (mounted.current) { setError(caught instanceof Error ? caught.message : 'Could not process this PDF.'); setStatus(''); } }
    finally { if (mounted.current) setBusy(false); }
  }
  const originalSize = files.reduce((sum, file) => sum + file.size, 0);
  return <div className="tool-workspace pdf-workspace"><form className="panel tool-controls" onSubmit={run}>
    <div className="tool-panel-heading"><span className="tool-step" aria-hidden="true">01</span><div><h2>Files &amp; options</h2><p>Your documents stay on this device.</p></div></div>
    <ChoiceSwitch label={compress ? 'Compression method' : 'PDF operation'} value={mode} disabled={busy} onChange={value => { setMode(value); setFiles([]); setRange(''); setAcknowledged(false); clearResult(); }} options={compress ? [['optimize', 'Optimize'], ['scan', 'Scanned PDF']] : [['merge', 'Merge PDFs'], ['extract', 'Extract pages']]} />
    <label className="file-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); choose(Array.from(event.dataTransfer.files)); }}><strong>Drop or choose {compress || mode === 'extract' ? 'a PDF' : 'PDF files'}</strong><span>10 MB per PDF ? 50 output pages{!compress && mode === 'merge' ? ' ? 10 files / 30 MB total' : ''}</span><input key={mode} aria-label="Choose PDF files" type="file" accept=".pdf,application/pdf" multiple={!compress && mode === 'merge'} disabled={busy} onChange={event => { choose(Array.from(event.target.files ?? [])); event.target.value = ''; }} /></label>
    <ol className="pdf-file-list">{files.map((file, index) => <li key={`${file.name}-${index}`} draggable={!busy && mode === 'merge'} onDragStart={() => { dragged.current = index; }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); event.stopPropagation(); if (dragged.current !== null) move(dragged.current, index); dragged.current = null; }} onDragEnd={() => { dragged.current = null; }}><div><strong>{file.name}</strong><small>{size(file.size)}</small></div><div className="pdf-file-actions">{mode === 'merge' && <><button type="button" className="secondary" aria-label={`Move file ${index + 1} up`} disabled={busy || index === 0} onClick={() => move(index, index - 1)}>Up</button><button type="button" className="secondary" aria-label={`Move file ${index + 1} down`} disabled={busy || index === files.length - 1} onClick={() => move(index, index + 1)}>Down</button></>}<button type="button" className="secondary" disabled={busy} aria-label={`Remove file ${index + 1}`} onClick={() => { clearResult(); setFiles(current => current.filter((_, i) => i !== index)); }}>Remove</button></div></li>)}</ol>
    {mode === 'extract' && <label>Pages to extract<input value={range} disabled={busy} maxLength={500} onChange={event => { setRange(event.target.value); clearResult(); }} placeholder="1, 3-5" /><small>Blank includes all pages. Selected pages are saved together in one PDF.</small></label>}
    {compress && <p className="pdf-help">{mode === 'optimize' ? 'Optimize PDF structure while keeping page text and graphics. Already optimized files may not get smaller.' : 'For scanned documents: rebuild pages as compressed images. This removes selectable text, links, bookmarks and accessibility tags, and may reduce clarity.'}</p>}
    {mode === 'scan' && <label className="pdf-consent"><input type="checkbox" required checked={acknowledged} disabled={busy} onChange={event => { setAcknowledged(event.target.checked); clearResult(); }} /><span>I understand that scanned compression creates image-only pages.</span></label>}
    <p className="pdf-help">Use plain, unsigned PDFs. Password-protected files and interactive forms are not supported. Merge/extract preserves page content, but not document-level bookmarks or attachments.</p>
    <button disabled={busy || !files.length || (mode === 'merge' && files.length < 2) || (mode === 'scan' && !acknowledged)}>{busy ? 'Processing...' : compress ? 'Compress PDF' : mode === 'merge' ? 'Merge PDFs' : 'Extract pages'}</button>
  </form><section className="panel tool-output" aria-label="PDF result" aria-busy={busy}><div className="tool-panel-heading"><span className="tool-step" aria-hidden="true">02</span><div><h2>Preview &amp; download</h2><p>Check the output before using it.</p></div></div>
    {busy && <progress max="100" value={progress} aria-label="PDF processing progress" />}{status && <p role="status">{status}</p>}{error && <p role="alert" className="admin-error">{error} Correct the files or options and try again.</p>}
    {!result && !busy && !error && <div className="tool-empty"><h2>Your PDF will appear here</h2><p>Add files to get started. No account required.</p></div>}
    {result && <><p><strong>{result.pages} {result.pages === 1 ? 'page' : 'pages'}</strong> ? {size(result.blob.size)}</p>{compress && <p>{result.unchanged ? 'No size reduction. The original PDF is retained for download.' : `Original ${size(originalSize)} ? ${size(result.blob.size)} (${Math.round((1 - result.blob.size / originalSize) * 100)}% smaller)`}</p>}{preview && <figure className="image-preview"><img src={preview} alt="First page of processed PDF" /><figcaption>First-page preview</figcaption></figure>}{previewError && <p role="status">{previewError}</p>}<button onClick={() => download(result.blob, compress ? 'compressed.pdf' : mode === 'merge' ? 'merged.pdf' : 'extracted-pages.pdf')}>Download PDF</button></>}
  </section></div>;
}
