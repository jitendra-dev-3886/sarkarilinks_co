import { CategoryIcon, NewNotice } from '../../components/NoticeVisuals';
import Deadline from '../../components/Deadline';
import ChoiceSwitch from '../../components/ChoiceSwitch';
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
  ['results', 'Results'], ['admit-cards', 'Admit cards'], ['jobs', 'Latest jobs'],
  ['admissions', 'Admissions'], ['answer-keys', 'Answer keys'], ['syllabus', 'Syllabus'],
  ['certificate-verification', 'Certificate verification'],
] as const;

export default function ClassicHome({ tools }: { tools: PortalTool[] }) {
  const navigate = useNavigate(), session = useMemberSession();
  const [locale, setLocale] = useState('en'), [closing, setClosing] = useState(false);
  const queries = useQueries({ queries: sections.map(([type]) => ({
    queryKey: ['classic-notices', type, locale, type === 'jobs' && closing],
    queryFn: ({ signal }: { signal: AbortSignal }) => getJson<Page>(`/content?type=${type}&locale=${locale}&sort=${type === 'jobs' && closing ? 'closing-soon' : 'newest'}&per_page=10`, signal),
    staleTime: 60_000,
  })) });
  const refreshing = queries.some(query => query.isFetching);
  return <div className="classic-home compact-cards">
    {session.data?.data?.roles.includes('administrator') && session.data.data.permissions.includes('settings.manage') && <div className="home-admin-actions"><Link to="/admin?tab=appearance">Customize homepage</Link></div>}
    <section className="classic-masthead notice-desk" aria-labelledby="notice-desk-title">
      <div className="notice-desk-heading"><span className="eyebrow">THE NOTICE DESK</span><h1 id="notice-desk-title">Government Jobs, Results &amp; Admit Cards</h1><p>Find your next opportunity. Stay ready for your next exam.</p></div>
      <form role="search" className="classic-search" onSubmit={event => { event.preventDefault(); navigate(`/search?q=${encodeURIComponent(String(new FormData(event.currentTarget).get('q') ?? '').trim())}`); }}>
        <label className="sr-only" htmlFor="classic-search">Search jobs and updates</label>
        <input id="classic-search" name="q" maxLength={150} placeholder="Search jobs, exams, results..." /><button aria-label="Search notices"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></button>
      </form>
    </section>
    <nav className="classic-shortcuts" aria-label="Notice categories">{sections.map(([type, title]) => <Link key={type} to={`/${type}?locale=${locale}`}><CategoryIcon category={type} /><span>{title}</span><span aria-hidden="true">&#8599;</span></Link>)}<Link to="/tools"><CategoryIcon category="tools" /><span>Application tools</span><span aria-hidden="true">&#8599;</span></Link></nav>
    <HomeHighlights locale={locale} />

    <nav className="government-organizations" aria-label="Browse organizations"><strong>Browse by exam</strong>{['UPSC', 'SSC', 'Railway RRB', 'IBPS', 'UPSSSC', 'BPSC'].map(name => <Link key={name} to={`/search?q=${encodeURIComponent(name)}`}>{name}</Link>)}</nav>
    <div className="classic-controls"><div className="home-language"><span aria-hidden="true">Notice language</span><ChoiceSwitch label="Notice language" value={locale} onChange={value => setLocale(value)} options={[["en", "English"], ["hi", "Hindi"]]} /></div><button className="secondary" disabled={refreshing} onClick={() => queries.forEach(query => void query.refetch())}>{refreshing ? 'Checking updates...' : 'Refresh notices'}</button><Link to="/account?tab=saved">My saved jobs</Link></div>
    <div className="classic-columns">{sections.map(([type, title], index) => {
      const query = queries[index];
      return <section className="classic-column" key={type} aria-labelledby={`classic-${type}`}>
        <h2 id={`classic-${type}`}><Link to={`/${type}?locale=${locale}`}>{title}</Link></h2>
        {type === 'jobs' && <div className="home-job-tabs"><button aria-pressed={!closing} onClick={() => setClosing(false)}>Latest jobs</button><button aria-pressed={closing} onClick={() => setClosing(true)}>Closing soon</button></div>}
        {query.isPending && <p role="status">Loading {title.toLowerCase()}...</p>}
        {query.error && <p role="alert">Could not load notices. <button className="text-button" onClick={() => void query.refetch()}>Try again</button></p>}
        {query.data?.data.length === 0 && <p>{type === 'jobs' && closing ? 'No upcoming deadlines right now.' : `No published ${title.toLowerCase()} in ${locale === 'hi' ? 'Hindi' : 'English'} yet.`}</p>}
        <ul>{query.data?.data.map(item => <li key={item.id}><NewNotice published={item.published_at} /><Link lang={item.locale} to={`/${item.type}/${item.slug}?locale=${item.locale}`}>{item.title}</Link><small>{item.organization} &middot; {new Date(item.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}</small>{type === 'jobs' && item.closing_date && <Deadline value={item.closing_date} />}{type === 'jobs' && <BookmarkButton content={item} />}</li>)}</ul>
        <Link className="classic-view-all" to={`/${type}?locale=${locale}`}>View all {title.toLowerCase()} &rarr;</Link>
      </section>;
    })}<section className="classic-column"><h2><Link to="/tools">Application tools</Link></h2><ul>{tools.filter(tool => ['resume-builder', 'image-compressor', 'image-converter', 'image-to-text', 'image-to-pdf', 'pdf-compressor', 'pdf-merge-split', 'age'].includes(tool.slug)).map(tool => <li key={tool.slug}><Link to={`/tools/${tool.slug}`}>{tool.name}</Link></li>)}</ul><Link className="classic-view-all" to="/tools">View all tools &rarr;</Link></section><section className="classic-column"><h2>Browse organizations</h2><ul>{['UPSC', 'SSC', 'IBPS', 'Railway RRB', 'UPSSSC', 'BPSC'].map(name => <li key={name}><Link to={`/search?q=${encodeURIComponent(name)}`}>{name}</Link></li>)}</ul><Link className="classic-view-all" to="/sitemap">All sections &rarr;</Link></section></div>
    <ReturnVisit tools={tools} />
  </div>;
}
