import Icon from '../../components/Icon';
import { type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categories, getJson, type Page } from '../../api/content';

const symbols = ['▤', '✓', '▣', '▧', '▥', '♜'];
const names = ['Latest Jobs', 'Results', 'Admit Cards', 'Answer Key', 'Syllabus', 'Schemes'];
const searches = ['SSC CGL', 'UPSC', 'IBPS PO', 'RRB NTPC', 'UP Police', 'CTET'];


function Updates({ type, notifications = false }: { type?: string; notifications?: boolean }) {
  const query = useQuery({
    queryKey: ['home-updates', type],
    queryFn: ({ signal }) => getJson<Page>(`/content?per_page=5${type ? `&type=${type}` : ''}`, signal),
  });
  if (query.isPending) return <div className="update-placeholder" role="status"><span className="loading-line" /><span className="loading-line" /><span className="loading-line" /><p>Loading latest updates…</p></div>;
  if (query.error) return <div className="update-placeholder"><span className="empty-icon" aria-hidden="true">▤</span><strong>Updates are unavailable</strong><p>We couldn’t reach the updates service.</p><button className="text-button" onClick={() => void query.refetch()}>Try again ↻</button></div>;
  if (!query.data?.data.length) return <div className="update-placeholder"><span className="empty-icon" aria-hidden="true">▤</span><strong>New updates coming soon</strong><p>Verified notices will appear here when published.</p><Link to={type ? `/${type}` : '/search'}>Explore updates →</Link></div>;
  return <div className="home-feed">{query.data.data.map((item, index) => <Link key={item.id} to={`/${item.type}/${item.slug}`} className="home-feed-row"><span className={`mini-icon color-${index % 6}`} aria-hidden="true"><Icon name={symbols[index % 6]} /></span><span><strong>{item.title}</strong><small>{notifications ? item.organization : `${item.closing_date ? 'Last date: ' + item.closing_date : 'Published: ' + new Date(item.published_at).toLocaleDateString('en-IN')}`}</small></span><span aria-hidden="true" className="row-arrow">›</span></Link>)}</div>;
}

export function QuickFilters() {
  const navigate = useNavigate();
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) => { if (value) params.set(key, String(value)); });
    navigate(`/jobs?${params}`);
  }
  return <section className="quick-filters"><h2>Quick <span>Filters</span></h2><form onSubmit={apply}>
    {([
      ['qualification', 'Qualification', [['10th', '10th pass'], ['12th', '12th pass'], ['graduate', 'Graduate'], ['postgraduate', 'Postgraduate']]],
      ['state', 'State', [['uttar-pradesh', 'Uttar Pradesh'], ['bihar', 'Bihar'], ['delhi', 'Delhi'], ['rajasthan', 'Rajasthan']]],
      ['department', 'Department', [['ssc', 'SSC'], ['upsc', 'UPSC'], ['railways', 'Railways'], ['banking', 'Banking']]],
      ['category', 'Category', [['central-government', 'Central government'], ['state-government', 'State government'], ['defence', 'Defence'], ['teaching', 'Teaching']]],
      ['sort', 'Closing date', [['closing-soon', 'Closing soon'], ['newest', 'Newest first']]],
    ] as const).map(([name, label, options]) => <label key={name}>{label}<select name={name} defaultValue=""><option value="">Select</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>)}
    <button type="submit">☷ Apply Filters</button>
  </form></section>;
}

export default function Home() {
  const navigate = useNavigate();
  const toolQuery = useQuery({ queryKey: ['tools'], queryFn: () => getJson<{ data: { slug: string; name: string }[] }>('/tools') });
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(String(new FormData(event.currentTarget).get('q') ?? '').trim())}`);
  }
  return <div className="portal-layout"><div className="portal-primary">
    <section className="reference-hero">
      <div className="hero-building" aria-hidden="true" />
      <div className="hero-copy"><span className="hero-kicker">YOUR NEXT OPPORTUNITY STARTS HERE</span><h1>Find Your Dream<br /><span>Government Job</span></h1><p>Latest Jobs, Results, Admit Cards, Schemes and<br className="desktop-break" /> All Government Updates in One Place</p>
        <form className="hero-search" role="search" onSubmit={search}><span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="home-search">Search government updates</label><input id="home-search" name="q" placeholder="Search for jobs, results, admit cards…" maxLength={150} /><button>Search</button></form>
        <div className="trending"><span>Popular searches:</span>{searches.map(term => <Link key={term} to={`/search?q=${encodeURIComponent(term)}`}>{term}</Link>)}</div>
      </div>
    </section>
    <div className="discovery-shortcuts"><Link to="/jobs?sort=closing-soon"><span>?</span><div><strong>Closing soon</strong><small>Check deadlines before you apply</small></div><b>?</b></Link><Link to="/admit-cards"><span>?</span><div><strong>Ready for exam day?</strong><small>Find your admit card and instructions</small></div><b>?</b></Link></div><QuickFilters />
    <section className="home-categories" aria-label="Browse updates">{categories.map(([path, , caption], index) => <Link key={path} to={`/${path}`} className={`home-category tint-${index}`}><span className={`mini-icon color-${index}`} aria-hidden="true"><Icon name={symbols[index]} /></span><strong>{names[index]}</strong><small>{caption}</small></Link>)}</section>
    <div className="update-columns">{(['jobs', 'results', 'admit-cards', 'schemes'] as const).map((type, index) => <section className="home-panel" key={type}><div className="home-panel-heading"><h2>{['Latest Jobs', 'Latest Results', 'Admit Cards', 'Government Schemes'][index]}</h2><Link to={`/${type}`}>View All</Link></div><Updates type={type} /></section>)}</div>
    <div className="home-bottom"><section className="preparation"><div className="study-art" aria-hidden="true">▤<span>✦</span></div><div><h2>Prepare Smarter, Not Harder!</h2><p>Find exam syllabuses and preparation resources.</p></div><Link to="/syllabus">Start Now</Link></section><LinkPanel title="Important Links" terms={['UPSC', 'SSC', 'Railway', 'Banking', 'State PSC', 'Defence', 'Teaching', 'All Jobs']} /><LinkPanel title="Popular Links" terms={['Exam Calendar', 'Current Affairs', 'Study Material', 'Government Schemes', 'Admit Cards', 'Job Alerts']} /></div>
  </div><aside className="portal-sidebar">
    <section className="home-panel notifications"><div className="home-panel-heading"><h2>Latest Notifications</h2><Link to="/search">View All</Link></div><Updates notifications /><Link className="outline-action" to="/search">Browse all notifications →</Link></section>
    <section className="home-panel tools-panel" id="tools"><div className="home-panel-heading"><h2>Tools &amp; calculators</h2><Link to="/tools">View all</Link></div><div className="tools-grid">{toolQuery.data?.data.map((tool, index) => <Link key={tool.slug} className={`tool-card tint-${index}`} to={`/tools#${tool.slug}`}><span className={`mini-icon color-${index}`} aria-hidden="true">{['?', '?', '%'][index]}</span><strong>{tool.name}</strong></Link>)}</div>{toolQuery.error && <p className="tool-status">Tools could not be loaded. <button className="text-button" onClick={() => void toolQuery.refetch()}>Retry</button></p>}<p className="tool-status">Calculate on your device. No uploads needed.</p></section>
    <section className="home-panel subscribe-panel"><h2>Stay Updated</h2><p>Get the latest updates in your inbox.</p><div className="subscribe-preview"><span>Email alerts are coming soon</span><span aria-hidden="true">✉</span></div><small>✓ Consent-based alerts &nbsp; ◇ Unsubscribe anytime</small></section>
  </aside></div>;
}

function LinkPanel({ title, terms }: { title: string; terms: string[] }) {
  return <section className="home-panel link-panel"><div className="home-panel-heading"><h2>{title}</h2></div><div className="link-chips">{terms.map(term => <Link key={term} to={`/search?q=${encodeURIComponent(term)}`}>{term}</Link>)}</div></section>;
}
