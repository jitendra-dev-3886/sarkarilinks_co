import { type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Home from '../features/home/Home';
import Tools from '../features/tools/Tools';
import { detailLabels } from '../features/admin/Advertisements';
import ListingFilters from '../features/search/ListingFilters';
import Admin, { Login } from '../features/admin/Admin';
import { Header, Footer } from '../components/PortalShell';
import { categories, getJson, type Content, type Page } from '../api/content';

function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('q')?.toString().trim() ?? '';
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }
  return <form className="search" onSubmit={submit} role="search"><label className="sr-only" htmlFor="query">Search government updates</label><input id="query" name="q" defaultValue={params.get('q') ?? ''} placeholder="Search jobs, exams, results and more…" maxLength={150} /><button>Search updates <span aria-hidden="true">→</span></button></form>;
}
function Feed({ type, compact = false }: { type?: string; compact?: boolean }) {
  const [params, setParams] = useSearchParams();
  const query = new URLSearchParams(params);
  if (type) query.set('type', type);
  if (compact) { query.set('per_page', '5'); query.delete('page'); }
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['content', query.toString()], queryFn: ({ signal }) => getJson<Page>(`/content?${query}`, signal) });
  if (isPending) return <p className="feedback" role="status">Loading latest updates…</p>;
  if (error) return <div className="feedback" role="alert"><p>{error.message}</p><button className="secondary" onClick={() => void refetch()}>Try again</button></div>;
  if (!data?.data.length) return <div className="feedback"><h3>No updates found</h3><p>Try another search or check back after our editors publish verified updates.</p></div>;
  return <><div className="feed">{data.data.map(item => <article key={item.id}><div><span className="eyebrow">{item.organization}</span><Link className="item-title" to={`/${item.type}/${item.slug}${item.locale === 'hi' ? '?locale=hi' : ''}`}>{item.title}</Link><p>{item.summary}</p><small>Published {date(item.published_at)}{item.closing_date && ` · Closes ${date(item.closing_date)}`}</small></div><span aria-hidden="true">↗</span></article>)}</div>{!compact && <div className="pagination"><button disabled={data.meta.current_page <= 1} onClick={() => setParams(p => { p.set('page', String(data.meta.current_page - 1)); return p; })}>Previous</button><span>Page {data.meta.current_page} of {data.meta.last_page} · {data.meta.total} updates</span><button disabled={data.meta.current_page >= data.meta.last_page} onClick={() => setParams(p => { p.set('page', String(data.meta.current_page + 1)); return p; })}>Next</button></div>}</>;
}
function date(value: string) { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' }).format(new Date(value)); }
function Listing({ type }: { type?: string }) {
  const [params, setParams] = useSearchParams();
  const title = categories.find(c => c[0] === type)?.[1] ?? 'Search updates';
  return <section><div className="page-intro"><span className="eyebrow">FIND WHAT MATTERS</span><h1>{title}</h1><Search /></div><ListingFilters /><div className="panel"><div className="panel-heading"><h2>{params.get('q') ? `Results for “${params.get('q')}”` : 'Latest published updates'}</h2><label>Sort <select value={params.get('sort') ?? 'newest'} onChange={e => setParams(p => { p.set('sort', e.target.value); p.delete('page'); return p; })}><option value="newest">Newest first</option><option value="closing-soon">Closing soon</option></select></label></div><Feed type={type} /></div></section>;
}
function Detail() {
  const { type, slug } = useParams();
  const [params] = useSearchParams();
  const locale = params.get('locale') === 'hi' ? 'hi' : 'en';
  const { data, isPending, error } = useQuery({ queryKey: ['detail', type, slug, locale], queryFn: ({ signal }) => getJson<{ data: Content }>(`/content/${encodeURIComponent(type!)}/${encodeURIComponent(slug!)}?locale=${locale}`, signal) });
  if (isPending) return <p role="status">Loading update…</p>;
  if (error || !data) return <div role="alert"><h1>Unable to open this update</h1><p>{error?.message}</p><Link to="/">Return home</Link></div>;
  const item = data.data;
  return <article className="panel detail"><Link to={`/${item.type}?locale=${item.locale}`}>← Back to listing</Link><p className="eyebrow">{item.organization}</p><h1>{item.title}</h1><p className="lead">{item.summary}</p><div className="metadata">Verified {date(item.verified_at)} · Updated {date(item.updated_at)}</div><div className="detail-facts"><div><span>Issuing authority</span><strong>{item.organization}</strong></div>{item.closing_date && <div><span>Closing date</span><strong>{date(item.closing_date)}</strong></div>}<div><span>Source checked</span><strong>{date(item.verified_at)}</strong></div></div>{item.details && Object.values(item.details).some(Boolean) && <nav className="detail-jump" aria-label="Notice sections">{Object.entries(item.details).filter(([, value]) => value).map(([key]) => <a href={`#notice-${key}`} key={key}>{detailLabels[key] ?? key}</a>)}</nav>}<div className="notice-sections">{Object.entries(item.details ?? {}).filter(([, value]) => value).map(([key, value]) => <section id={`notice-${key}`} key={key}><h2>{detailLabels[key] ?? key}</h2><p className="body-text">{value}</p></section>)}</div><details className="full-notice" open={!item.details || !Object.values(item.details).some(Boolean)}><summary>Full notice details</summary><div className="body-text">{item.body}</div></details><a className="button" href={item.source_url} target="_blank" rel="noopener noreferrer">View official source ↗</a><p className="muted">Confirm eligibility and deadlines with the issuing authority before applying.</p></article>;
}
export default function App() {
  return <><a className="skip" href="#main">Skip to content</a><Header /><main id="main"><Routes><Route path="/login" element={<Login />} /><Route path="/admin" element={<Admin />} /><Route path="/" element={<Home />} /><Route path="/tools" element={<Tools />} /><Route path="/search" element={<Listing />} />{categories.map(([type]) => <Route key={type} path={`/${type}`} element={<Listing type={type} />} />)}<Route path="/:type/:slug" element={<Detail />} /><Route path="*" element={<section><h1>Page not found</h1><Link to="/">Return home</Link></section>} /></Routes></main><Footer /></>;
}
