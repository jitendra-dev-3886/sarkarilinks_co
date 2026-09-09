import { useState, useEffect, useRef } from "react";
import ChoiceSwitch from "../../components/ChoiceSwitch";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { staffApi } from "../../api/session";
import { useMemberSession } from "../account/Account";
import { size } from "./browser-tools";
interface Download {
  id: string;
  title: string | null;
  url: string;
  format: string;
  status: string;
  size: number | null;
  error: string | null;
  expires_at: string;
}
export default function MediaDownloader() {
  const session = useMemberSession();
  const [format, setFormat] = useState('video'), [url, setUrl] = useState(''), [permission, setPermission] = useState(false);
  const [now, setNow] = useState(Date.now);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  const signedIn = !!session.data?.data;
  const query = useQuery({ queryKey: ['media-downloads'], queryFn: () => staffApi<{ data: Download[] }>('/account/downloads'), enabled: signedIn,
    refetchInterval: q => q.state.data?.data.some(item => ['queued', 'processing'].includes(item.status)) ? 3000 : q.state.data?.data.length ? 30_000 : false });
  const mutation = useMutation({ mutationFn: (body: unknown) => staffApi('/account/downloads', 'POST', body), onSuccess: async () => { await query.refetch(); } });
  return <div className="tool-workspace media-workspace"><section className="panel tool-controls">
    <div className="tool-panel-heading"><span className="tool-step" aria-hidden="true">01</span><div><h2>Prepare your download</h2><p>Paste a public link and choose a format.</p></div></div>
    <div className="media-platforms" aria-label="Supported sources"><span>YouTube</span><span>Instagram</span><span>Facebook</span></div>
    <form onSubmit={event => { event.preventDefault(); if (signedIn && !mutation.isPending) mutation.mutate({ url: url.trim(), format, permission }); }}>
      <label>Public media URL<input ref={input} name="url" type="url" pattern="https://.*" required value={url} onChange={event => { setUrl(event.target.value); mutation.reset(); }} disabled={mutation.isPending} placeholder="https://www.youtube.com/watch?v=..." maxLength={2048} /><small>Use the HTTPS link to a public video or post.</small></label>
      <ChoiceSwitch label="Download format" name="format" value={format} onChange={value => { setFormat(value); mutation.reset(); }} disabled={mutation.isPending} options={[["video", "Video (up to 720p)"], ["audio", "Audio (MP3)"]]} />
      <label className="checkbox-label media-permission"><input type="checkbox" name="permission" required checked={permission} disabled={mutation.isPending} onChange={event => setPermission(event.target.checked)} /><span>I own this media or have permission to download it.</span></label>
      {session.isPending ? <p role="status">Checking your account...</p> : session.error ? <p role="alert">Could not check your session. <button type="button" className="text-button" onClick={() => void session.refetch()}>Retry</button></p> : signedIn ? <button className="media-submit" disabled={mutation.isPending}>{mutation.isPending ? 'Adding to your downloads...' : 'Prepare download'}</button> : <div className="media-signin"><strong>Save downloads to your private account</strong><p>Sign in to submit a link and track processing.</p><Link className="button" to="/account/login?returnTo=%2Ftools%2Fmedia-downloader">Sign in to prepare a download</Link></div>}
      {mutation.error && <p className="admin-error" role="alert">{mutation.error.message}</p>}{mutation.isSuccess && <p role="status" className="admin-success">Request submitted. Follow its status in Your downloads.</p>}
    </form>
    <details className="media-limits"><summary>Limits &amp; supported links</summary><ul><li>Up to 10 minutes and 50 MB per file.</li><li>Private, login-only, live and protected media are unsupported.</li><li>Platform restrictions can prevent a download.</li><li>Processing runs on our server. Files expire one hour after the request.</li></ul></details>
  </section><section className="panel tool-output" aria-label="Download history"><div className="tool-panel-heading"><span className="tool-step" aria-hidden="true">02</span><div><h2>Your downloads</h2><p>Processing status and available files.</p></div></div>
    {signedIn && <div className="media-history-toolbar"><span>Private to your account</span><button type="button" className="secondary" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Refreshing...' : 'Refresh downloads'}</button></div>}
    {signedIn && query.isPending && <p role="status">Loading downloads...</p>}
    {query.error && <p role="alert" className="admin-error">Could not load download history. Use Refresh downloads to try again.</p>}
    {(!signedIn || (query.isSuccess && !query.data.data.length)) && <div className="tool-empty media-empty"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></svg><h3>{signedIn ? 'No downloads yet' : 'Your download workspace'}</h3><p>{signedIn ? 'Submit a permitted public link. Its status and download will appear here.' : 'Sign in to view and prepare your downloads.'}</p></div>}
    {query.data?.data.map(item => {
      const expired = new Date(item.expires_at).getTime() <= now;
      const state = expired ? 'expired' : item.status;
      const label = state === 'ready' ? 'Ready to download' : state === 'failed' ? 'Could not prepare' : state === 'queued' ? 'In queue' : state === 'processing' ? 'Processing' : state === 'expired' ? 'Expired' : 'Status unavailable';
      return <article className="download-item media-job" key={item.id}><div className="media-job-top"><span className={`media-job-status status-${state}`} role="status">{label}</span><span>{item.format === 'audio' ? 'MP3 audio' : 'Video'}</span></div><h3>{item.title || 'Media download'}</h3><p className="media-source-url">{item.url}</p>
        {['queued', 'processing'].includes(state) && <p className="media-job-note">This may take a few minutes. Status updates automatically.</p>}
        {state === 'failed' && <p className="admin-error">{item.error || 'The source could not be processed. Check the link and try again.'}</p>}
        {state === 'ready' && <><p className="media-job-note">{item.size !== null ? size(item.size) : 'Size unavailable'} ? Available until {new Date(item.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p><a className="button" href={`/api/v1/account/downloads/${encodeURIComponent(item.id)}/file`}>Download {item.format === 'audio' ? 'MP3' : 'video'}</a></>}
        {['failed', 'expired'].includes(state) && <button type="button" className="secondary" disabled={mutation.isPending} onClick={() => { setUrl(item.url); setFormat(item.format); setPermission(false); mutation.reset(); input.current?.focus(); }}>Use link again</button>}
      </article>;
    })}
  </section></div>;
}
