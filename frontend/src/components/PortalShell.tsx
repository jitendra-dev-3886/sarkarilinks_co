import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { informationLinks } from '../features/pages/SitePages';
import Brand from './Brand';
import { useMemberSession } from '../features/account/Account';
const navigation = [['/jobs', 'Latest jobs'], ['/results', 'Results'], ['/admit-cards', 'Admit cards'], ['/admissions', 'Admissions'], ['/tools', 'Tools & AI']];
export function Header() {
  const [menu, setMenu] = useState(false), session = useMemberSession();
  return <header className="portal-header saas-header"><div className="header-inner"><Link className="brand" to="/" aria-label="SarkariLinks home"><Brand /></Link><button className="menu-toggle secondary" aria-expanded={menu} aria-controls="navigation" onClick={() => setMenu(!menu)}>Menu</button><nav id="navigation" className={menu ? 'open' : ''} aria-label="Main navigation">{navigation.map(([path, label]) => <NavLink key={path} to={path} onClick={() => setMenu(false)}>{label}{path === '/tools' && <span className="nav-new">NEW</span>}</NavLink>)}<NavLink to="/tools/resume-builder" onClick={() => setMenu(false)}>Résumé builder</NavLink><Link className="mobile-account" to={session.data?.data ? '/account' : '/account/login'} onClick={() => setMenu(false)}>{session.data?.data ? 'My workspace' : 'Sign in / create account'}</Link></nav><Link className="button account-link" to={session.data?.data ? '/account' : '/account/login'}>{session.data?.data ? 'My workspace' : 'Get started'} <span aria-hidden="true">↗</span></Link></div></header>;
}
export function Footer() {
  return <footer className="portal-footer saas-footer essential-footer"><div className="essential-footer-inner"><div><Link className="brand" to="/"><Brand /></Link><p>Independent information portal. Verify notices with the issuing authority.</p></div><nav aria-label="Footer information">{informationLinks.filter(([path]) => path !== 'faq').map(([path, label]) => <Link key={path} to={`/${path}`}>{label}</Link>)}</nav></div><div className="footer-bottom"><span>&copy; {new Date().getFullYear()} SarkariLinks</span><span>We do not collect government application fees.</span></div></footer>;
}
