import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getJson, type Page } from '../../api/content';
import { BookmarkButton, useMemberSession } from '../account/Account';
import type { PortalTool } from '../tools/Tools';
import ReturnVisit from './ReturnVisit';
import HomeHighlights from './HomeHighlights';
import NoticeBoard from './NoticeBoard';
import './dashboard.css';
import ClassicHome from './ClassicHome';
import { useHomeLayout } from '../appearance/Appearance';

const destinations = [
  { path: '/jobs', title: 'Latest jobs', detail: 'Find an opportunity', icon: 'jobs' },
  { path: '/results', title: 'Results', detail: 'Check your result', icon: 'results' },
  { path: '/admit-cards', title: 'Admit cards', detail: 'Get exam-ready', icon: 'card' },
  { path: '/tools', title: 'Tools & AI', detail: 'Prepare your documents', icon: 'tools' },
];
const utilityLabels: Record<string, string> = { 'image-compressor': 'Compress a photo', 'resume-builder': 'Build my resume', 'image-to-text': 'Extract text from a file' };

function ShortcutIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'jobs' ? <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12l9 3 9-3M12 12v5" /></> : name === 'results' ? <><path d="M8 3h8l4 4v14H4V3h4M15 3v5h5M8 14l3 3 5-6" /></> : name === 'card' ? <><rect x="2" y="5" width="20" height="15" rx="2" /><circle cx="8" cy="11" r="2" /><path d="M5 17c0-4 6-4 6 0M15 10h4M15 14h4" /></> : <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /><path d="M17 2v9M13 6h8M6 14v7M3 17.5h6" /></>}
  </svg>;
}

export default function Home() {
  const navigate = useNavigate(), session = useMemberSession();
  const layout = useHomeLayout();
  const [jobSort, setJobSort] = useState('newest');
  const jobs = useQuery({ enabled: layout === 'theme', queryKey: ['home-jobs', jobSort], queryFn: () => getJson<Page>(`/content?type=jobs&per_page=4&sort=${jobSort}`) });
  const tools = useQuery({ queryKey: ['tools'], queryFn: () => getJson<{ data: PortalTool[] }>('/tools') });
  const available = tools.data?.data.filter(tool => tool.slug in utilityLabels) ?? [];
  if (layout === 'classic' || layout === 'classic-quick') return <ClassicHome quickStart={layout === 'classic-quick'} tools={tools.data?.data ?? []} />;
  return <div className="saas-home essential-home task-home">
    {session.data?.data?.roles.includes('administrator') && session.data.data.permissions.includes('settings.manage') && <div className="home-admin-actions"><Link to="/admin?tab=appearance">Customize homepage</Link><span>Administrator controls</span></div>}
    <section className="saas-hero task-hero">
      <div className="hero-copy"><span className="task-hero-label">YOUR NEXT STEP STARTS HERE</span><h1>Find your opportunity.<br /><em>Make your next move.</em></h1><p>Jobs, exam updates and application tools. Get straight to what you need.</p>
        <form className="hero-search" role="search" onSubmit={event => { event.preventDefault(); navigate(`/search?q=${encodeURIComponent(String(new FormData(event.currentTarget).get('q') ?? '').trim())}`); }}>
          <label className="sr-only" htmlFor="home-search">Search jobs and updates</label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg><input id="home-search" name="q" maxLength={150} placeholder="Search an exam, job or organization" /><button>Find opportunities <span aria-hidden="true">→</span></button>
        </form>
      </div>
      <nav className="home-intent-grid" aria-label="Quick access">{destinations.map(item => <Link key={item.path} to={item.path}><span className="intent-icon"><ShortcutIcon name={item.icon} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><span className="intent-arrow" aria-hidden="true">↗</span></Link>)}</nav>
      <div className="task-hero-foot"><span>Independent portal · Official source links on notices</span><Link to="/sitemap">All sections <span aria-hidden="true">→</span></Link></div>
    </section>
    <HomeHighlights />
    <ReturnVisit tools={tools.data?.data ?? []} />
    {available.length > 0 && <nav className="home-utility-strip" aria-label="Application tools"><span className="utility-strip-title">Get application-ready</span>{available.map(tool => <Link key={tool.slug} to={`/tools/${tool.slug}`}><ShortcutIcon name="tools" />{utilityLabels[tool.slug]}<span aria-hidden="true">↗</span></Link>)}</nav>}
    <section className="home-section task-jobs"><div className="section-title"><div><span className="eyebrow">OPPORTUNITIES</span><h2>Latest government jobs</h2><p>Find a role. Check the source. Save your next step.</p></div><Link className="subtle-link" to="/jobs">View all jobs →</Link></div>
      <div className="home-job-tabs" aria-label="Job ordering"><button aria-pressed={jobSort === 'newest'} onClick={() => setJobSort('newest')}>Latest jobs</button><button aria-pressed={jobSort === 'closing-soon'} onClick={() => setJobSort('closing-soon')}>Closing soon</button></div>
      {jobs.isPending && <p role="status">Loading latest jobs…</p>}{jobs.error && <p role="alert">{jobs.error.message} <button className="text-button" onClick={() => void jobs.refetch()}>Try again</button></p>}
      <div className="home-job-grid">{jobs.data?.data.map(item => <article className="panel home-job" key={item.id}><div className="job-card-top"><span className="organization-avatar">{item.organization.slice(0, 2).toUpperCase()}</span><BookmarkButton content={item} /></div><span className="eyebrow">{item.organization}</span><h3><Link to={`/jobs/${item.slug}?locale=${item.locale}`}>{item.title}</Link></h3><p>{item.summary}</p><div className="job-card-bottom"><span>{item.closing_date ? `Closes ${new Date(item.closing_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}` : 'View notice for dates'}</span><Link to={`/jobs/${item.slug}?locale=${item.locale}`} aria-label={`Read ${item.title}`}>↗</Link></div></article>)}</div>
      {jobs.data?.data.length === 0 && <div className="empty-workspace"><div><h3>{jobSort === 'closing-soon' ? 'No upcoming deadlines right now' : 'No published jobs right now'}</h3><p>{jobSort === 'closing-soon' ? 'Check the latest jobs for notices without a listed closing date.' : 'Reviewed opportunities will appear here. Explore the application tools and exam updates while new jobs are reviewed.'}</p></div><Link className="button secondary" to="/tools">Open tools →</Link></div>}
    </section>
    <NoticeBoard />
  </div>;
}
