import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { informationLinks } from '../features/pages/SitePages';
import Brand from './Brand';
import { useMemberSession } from '../features/account/Account';
const navigation = [['/', 'Home'], ['/jobs', 'Latest jobs'], ['/results', 'Results'], ['/admit-cards', 'Admit cards'], ['/answer-keys', 'Answer keys'], ['/syllabus', 'Syllabus'], ['/admissions', 'Admissions'], ['/tools', 'Application tools']];
export function Header() {
  const [menu, setMenu] = useState(false), session = useMemberSession(), location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  return <header className="portal-header new-header government-header"><div className="new-header-inner"><Link className="brand" to="/" aria-label="SarkariLinks home"><Brand /></Link><nav id="navigation" className={menu ? 'open' : ''} aria-label="Main navigation">{navigation.map(([path, label]) => <NavLink end key={path} to={path}>{label}</NavLink>)}<Link className="mobile-account" to={session.data?.data ? '/account' : '/account/login'}>{session.data?.data ? 'My workspace' : 'Create free account'}</Link></nav><div className="header-account">{!session.data?.data && <Link to="/account/login">Sign in</Link>}<Link className="button" to={session.data?.data ? '/account' : '/account/login'}>{session.data?.data ? 'My workspace' : 'Create account'} <span aria-hidden="true">&#8599;</span></Link></div><button className="new-menu secondary" aria-expanded={menu} aria-controls="navigation" onClick={() => setMenu(!menu)} onKeyDown={event => { if (event.key === 'Escape') setMenu(false); }}>{menu ? 'Close' : 'Menu'}</button></div></header>;
}
export function Footer() {
  return <footer className="portal-footer new-footer government-footer"><div className="new-footer-grid"><div><Link className="brand" to="/"><Brand /></Link><p>Government jobs, results, admit cards<br />and application resources.</p><span className="footer-note">Independent portal. Always check the official source.</span></div><div><h2>Application resources</h2><Link to="/tools">All tools</Link><Link to="/tools/resume-builder">Resume builder</Link><Link to="/account">Your account</Link><Link to="/tools/image-to-text">Document OCR</Link></div><div><h2>Discover</h2><Link to="/jobs">Latest jobs</Link><Link to="/results">Results</Link><Link to="/admit-cards">Admit cards</Link><Link to="/admissions">Admissions</Link></div><nav aria-label="Footer information"><h2>Information</h2>{informationLinks.filter(([slug]) => slug !== 'faq').map(([slug, label]) => <Link key={slug} to={`/${slug}`}>{label}</Link>)}</nav></div><div className="new-footer-bottom"><span>&copy; {new Date().getFullYear()} SarkariLinks</span><span>Built for your next step. No government application fees collected.</span></div></footer>;
}

const mobileDestinations = [
  { path: '/', label: 'Home', icon: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9' },
  { path: '/jobs', label: 'Jobs', icon: 'M8 6V3h8v3M3 7h18v14H3zM3 12h18M10 12v3h4v-3' },
  { path: '/tools', label: 'Tools', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
  { path: '/account?tab=saved', label: 'Saved', icon: 'M6 3h12v18l-6-4-6 4z' },
  { path: '/account', label: 'Account', icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2' },
];
export function MobileNavigation() {
  const location = useLocation();
  if (location.pathname === '/admin' || location.pathname === '/login') return null;
  const saved = location.pathname === '/account' && new URLSearchParams(location.search).get('tab') === 'saved';
  return <nav className="mobile-app-navigation" aria-label="Mobile navigation">{mobileDestinations.map(item => {
    const active = item.label === 'Saved' ? saved : item.label === 'Account' ? location.pathname.startsWith('/account') && !saved : item.path === '/' ? location.pathname === '/' : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    return <Link key={item.label} to={item.path} aria-current={active ? 'page' : undefined}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.icon} /></svg><span>{item.label}</span></Link>;
  })}</nav>;
}
