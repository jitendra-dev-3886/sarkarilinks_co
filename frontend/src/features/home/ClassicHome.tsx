import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getJson, type Page } from '../../api/content';
import { BookmarkButton, useMemberSession } from '../account/Account';
import type { PortalTool } from '../tools/Tools';
import ReturnVisit from './ReturnVisit';
import HomeHighlights from './HomeHighlights';
import './classic.css';

const sections = [
  ['jobs', 'Latest jobs'], ['results', 'Results'], ['admit-cards', 'Admit cards'],
  ['admissions', 'Admissions'], ['answer-keys', 'Answer keys'], ['syllabus', 'Syllabus'],
  ['certificate-verification', 'Certificate verification'],
] as const;

export default function ClassicHome({ tools, quickStart = false }: { tools: PortalTool[]; quickStart?: boolean }) {
  const navigate = useNavigate(), session = useMemberSession();
  const [locale, setLocale] = useState('en'), [closing, setClosing] = useState(false);
  const queries = useQueries({ queries: sections.map(([type]) => ({
    queryKey: ['classic-notices', type, locale, type === 'jobs' && closing],
    queryFn: ({ signal }: { signal: AbortSignal }) => getJson<Page>(`/content?type=${type}&locale=${locale}&sort=${type === 'jobs' && closing ? 'closing-soon' : 'newest'}&per_page=10`, signal),
    staleTime: 60_000,
  })) });
  const refreshing = queries.some(query => query.isFetching);
  return <div className="classic-home">
    {session.data?.data?.roles.includes('administrator') && session.data.data.permissions.includes('settings.manage') && <div className="home-admin-actions"><Link to="/admin?tab=appearance">Customize homepage</Link></div>}
    {quickStart ? <section className="classic-quick-start" aria-labelledby="quick-start-title">
      <div className="quick-start-copy"><span className="eyebrow">YOUR NEXT STEP</span><h1 id="quick-start-title">What would you like to do today?</h1><p>Choose a task and get straight to the information you need.</p><Link to="/search">Search all notices &rarr;</Link><small>Independent portal. Verify details with the issuing authority.</small></div>
      <nav className="quick-start-actions" aria-label="Start a task">{[
        ['/jobs', '01', 'Find a job', 'Explore recent opportunities'],
        ['/results', '02', 'Check a result', 'Find published exam results'],
        ['/admit-cards', '03', 'Get an admit card', 'Open exam-day notices'],
        ['/account?tab=saved', '04', 'Open my shortlist', 'Return to your saved jobs'],
      ].map(([path, number, title, detail]) => <Link key={path} to={path}><span aria-hidden="true">{number}</span><strong>{title}</strong><small>{detail}</small><b aria-hidden="true">&rarr;</b></Link>)}</nav>
    </section> : <section className="classic-masthead">
      <span className="eyebrow">JOBS &amp; EXAM UPDATE DESK</span>
      <h1>One place for your next update.</h1>
      <p>Latest jobs, results, admit cards and application resources.</p>
      <form role="search" className="classic-search" onSubmit={event => { event.preventDefault(); navigate(`/search?q=${encodeURIComponent(String(new FormData(event.currentTarget).get('q') ?? '').trim())}`); }}>
        <label className="sr-only" htmlFor="classic-search">Search jobs and updates</label>
        <input id="classic-search" name="q" maxLength={150} placeholder="Search an exam, job or organization" /><button>Search notices</button>
      </form>
      <p className="classic-source">Independent portal. Check the official source linked on each notice.</p>
    </section>}
    <nav className="classic-shortcuts" aria-label="Notice categories">{sections.map(([type, title]) => <Link key={type} to={`/${type}?locale=${locale}`}>{title}</Link>)}<Link to="/tools">Tools &amp; AI</Link></nav>
    <HomeHighlights locale={locale} />
    <ReturnVisit tools={tools} />
    <div className="classic-controls"><label>Notice language<select value={locale} onChange={event => setLocale(event.target.value)}><option value="en">English</option><option value="hi">Hindi</option></select></label><button className="secondary" disabled={refreshing} onClick={() => queries.forEach(query => void query.refetch())}>{refreshing ? 'Checking updates...' : 'Refresh notices'}</button><Link to="/account?tab=saved">My saved jobs</Link></div>
    <div className="classic-columns">{sections.map(([type, title], index) => {
      const query = queries[index];
      return <section className="classic-column" key={type} aria-labelledby={`classic-${type}`}>
        <h2 id={`classic-${type}`}><Link to={`/${type}?locale=${locale}`}>{title}</Link></h2>
        {type === 'jobs' && <div className="home-job-tabs"><button aria-pressed={!closing} onClick={() => setClosing(false)}>Latest jobs</button><button aria-pressed={closing} onClick={() => setClosing(true)}>Closing soon</button></div>}
        {query.isPending && <p role="status">Loading {title.toLowerCase()}...</p>}
        {query.error && <p role="alert">Could not load notices. <button className="text-button" onClick={() => void query.refetch()}>Try again</button></p>}
        {query.data?.data.length === 0 && <p>{type === 'jobs' && closing ? 'No upcoming deadlines right now.' : `No published ${title.toLowerCase()} in ${locale === 'hi' ? 'Hindi' : 'English'} yet.`}</p>}
        <ul>{query.data?.data.map(item => <li key={item.id}><Link lang={item.locale} to={`/${item.type}/${item.slug}?locale=${item.locale}`}>{item.title}</Link><small>{item.organization} &middot; {new Date(item.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}</small>{type === 'jobs' && <BookmarkButton content={item} />}</li>)}</ul>
        <Link className="classic-view-all" to={`/${type}?locale=${locale}`}>View all {title.toLowerCase()} &rarr;</Link>
      </section>;
    })}<section className="classic-column"><h2><Link to="/tools">Application tools</Link></h2><ul>{tools.filter(tool => ['resume-builder', 'image-compressor', 'image-converter', 'image-to-text', 'image-to-pdf', 'age'].includes(tool.slug)).map(tool => <li key={tool.slug}><Link to={`/tools/${tool.slug}`}>{tool.name}</Link></li>)}</ul><Link className="classic-view-all" to="/tools">View all tools &rarr;</Link></section><section className="classic-column"><h2>Browse organizations</h2><ul>{['UPSC', 'SSC', 'IBPS', 'Railway RRB', 'UPSSSC', 'BPSC'].map(name => <li key={name}><Link to={`/search?q=${encodeURIComponent(name)}`}>{name}</Link></li>)}</ul><Link className="classic-view-all" to="/sitemap">All sections &rarr;</Link></section></div>
  </div>;
}
