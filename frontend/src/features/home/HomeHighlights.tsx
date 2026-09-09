import Deadline from '../../components/Deadline';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { categories, getJson, type Page } from '../../api/content';
import './highlights.css';

export default function HomeHighlights({ locale = 'en' }: { locale?: string }) {
  const jobs = useQuery({ queryKey: ['hot-jobs', locale], queryFn: ({ signal }) => getJson<Page>(`/content?type=jobs&locale=${locale}&sort=newest&per_page=12`, signal), staleTime: 60_000 });
  const latest = useQuery({ queryKey: ['latest-ticker', locale], queryFn: ({ signal }) => getJson<Page>(`/content?locale=${locale}&sort=newest&per_page=8`, signal), staleTime: 60_000 });
  const viewport = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false), [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, previous = 0;
    const stop = () => { cancelAnimationFrame(frame); previous = 0; };
    const tick = (now: number) => {
      const node = viewport.current;
      if (node && previous) {
        const end = node.scrollWidth - node.clientWidth;
        if (end > 0) node.scrollLeft = node.scrollLeft >= end - 1 ? 0 : node.scrollLeft + Math.min(now - previous, 50) * .035;
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    const start = () => { stop(); if (!motion.matches && !paused && !hovered && !focused) frame = requestAnimationFrame(tick); };
    start(); motion.addEventListener('change', start);
    return () => { stop(); motion.removeEventListener('change', start); };
  }, [paused, hovered, focused, latest.data]);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const hot = (jobs.data?.data ?? []).filter(item => !item.closing_date || item.closing_date.slice(0, 10) >= today).slice(0, 4);
  return <div className="home-highlights">
    <section className="latest-ticker" aria-label="Latest updates">
      <strong className="ticker-label">Latest updates</strong>
      <div className="ticker-window" ref={viewport} tabIndex={0} aria-label="Latest notice links, scroll horizontally" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onTouchStart={() => setPaused(true)} onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
        {latest.isPending && <span>Loading updates...</span>}
        {latest.error && <span role="alert">Updates unavailable. <button className="text-button" onClick={() => void latest.refetch()}>Retry updates</button></span>}
        {latest.data?.data.length === 0 && <span>No published updates yet.</span>}
        <div className="ticker-links">{latest.data?.data.map(item => <Link key={item.id} lang={item.locale} to={`/${item.type}/${item.slug}?locale=${item.locale}`}><span>{categories.find(([type]) => type === item.type)?.[1] ?? 'Update'}</span>{item.title}{item.closing_date && <Deadline value={item.closing_date} />}</Link>)}</div>
      </div>
      {!!latest.data?.data.length && <button className="secondary ticker-pause" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume scrolling' : 'Pause scrolling'}</button>}
    </section>
    <section className="hot-jobs" aria-labelledby="hot-jobs-title"><div className="hot-jobs-heading"><h2 id="hot-jobs-title">Hot jobs</h2><p>Recent notices without a past closing date. Check eligibility and dates at the source.</p><Link to="/jobs">All jobs &rarr;</Link></div>
      {jobs.isPending && <p role="status">Loading jobs...</p>}
      {jobs.error && <p role="alert">Jobs unavailable. <button className="text-button" onClick={() => void jobs.refetch()}>Retry hot jobs</button></p>}
      {jobs.data && !hot.length && <p className="hot-jobs-empty">No recent open job notices yet.</p>}
      <div className="hot-job-links">{hot.map(item => <Link key={item.id} lang={item.locale} to={`/jobs/${item.slug}?locale=${item.locale}`}><span>{item.organization}</span><strong>{item.title}</strong>{item.closing_date ? <Deadline value={item.closing_date} /> : <small>Check notice for application dates</small>}</Link>)}</div>
    </section>
  </div>;
}
