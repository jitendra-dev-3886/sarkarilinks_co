import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getJson, type Page } from '../../api/content';

const sections = [
  ['results', 'Results', 'Check your result', 'परिणाम'],
  ['admit-cards', 'Admit cards', 'Prepare for exam day', 'प्रवेश पत्र'],
  ['answer-keys', 'Answer keys', 'Review the official answers', 'उत्तर कुंजी'],
] as const;

export default function NoticeBoard() {
  const [locale, setLocale] = useState<'en' | 'hi'>('en');
  const queries = useQueries({ queries: sections.map(([type]) => ({ queryKey: ['home-board', type, locale], queryFn: ({ signal }: { signal: AbortSignal }) => getJson<Page>(`/content?type=${type}&locale=${locale}&sort=newest&per_page=5`, signal), staleTime: 60_000 })) });
  const refreshing = queries.some(query => query.isFetching);
  return <section className="home-notice-board home-section" aria-labelledby="notice-board-title">
    <div className="section-title"><div><span className="eyebrow">YOUR EXAM UPDATE DESK</span><h2 id="notice-board-title">Find the update you came for</h2><p>Published notices, organized by what you need next.</p></div><div className="notice-board-controls"><label>Notice language<select value={locale} onChange={event => setLocale(event.target.value as 'en' | 'hi')}><option value="en">English</option><option value="hi">हिन्दी</option></select></label><button className="secondary" disabled={refreshing} onClick={() => { for (const query of queries) void query.refetch(); }}>{refreshing ? 'Checking updates…' : 'Refresh notices'}</button></div></div>
    <div className="notice-board-grid">{sections.map(([type, title, description, hindi], index) => {
      const query = queries[index];
      return <article className="panel notice-column" key={type}><header><span className="notice-column-mark" aria-hidden="true">0{index + 1}</span><div><h3 lang={locale}>{locale === 'hi' ? hindi : title}</h3><p>{description}</p></div></header>
        {query.isPending && <p role="status">Loading {title.toLowerCase()}…</p>}
        {query.error && <p role="alert">Could not load {title.toLowerCase()}. <button className="text-button" onClick={() => void query.refetch()}>Try again</button></p>}
        {query.data?.data.length === 0 && <p className="notice-column-empty">No published {title.toLowerCase()} in {locale === 'hi' ? 'Hindi' : 'English'} yet.</p>}
        <ul>{query.data?.data.map(item => <li key={item.id}><Link lang={item.locale} to={`/${item.type}/${item.slug}?locale=${item.locale}`}>{item.title}</Link><div><span>{item.organization}</span><time dateTime={item.published_at}>{new Date(item.published_at).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</time></div></li>)}</ul>
        <Link className="notice-column-all" to={`/${type}?locale=${locale}`}>View all {title.toLowerCase()} <span aria-hidden="true">→</span></Link>
      </article>;
    })}</div>
    <p className="notice-board-guidance">Independent information portal. Open each notice to check its official source and instructions.</p>
  </section>;
}
