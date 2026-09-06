import Icon from './Icon';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const navigation = [['/', 'Home'], ['/jobs', 'Jobs'], ['/results', 'Results'], ['/admit-cards', 'Admit Cards'], ['/answer-keys', 'Answer Key'], ['/syllabus', 'Syllabus'], ['/schemes', 'Schemes']];

export function Header() {
  const [menu, setMenu] = useState(false);
  return <header className="portal-header"><div className="header-inner"><Link className="brand" to="/"><span className="portal-brand-icon" aria-hidden="true">▥</span><span>Sarkari<span className="brand-blue">Links</span><small>Your Government Job Partner</small></span></Link><button className="menu-toggle secondary" aria-expanded={menu} aria-controls="navigation" onClick={() => setMenu(!menu)}>Menu</button><nav id="navigation" className={menu ? 'open' : ''} aria-label="Main navigation">{navigation.map(([path, label]) => <NavLink key={path} to={path} onClick={() => setMenu(false)}>{label}</NavLink>)}<a href="/#tools" onClick={() => setMenu(false)}>Tools &amp; Services</a></nav><Link className="button staff-link" to="/admin">Staff Login</Link><Link className="header-search" to="/search" aria-label="Search updates">⌕</Link></div></header>;
}

export function Footer() {
  return <footer className="portal-footer"><div className="footer-grid"><div className="footer-about"><Link className="brand" to="/"><span className="portal-brand-icon" aria-hidden="true">▥</span><span>SarkariLinks<small>Your Government Job Partner</small></span></Link><p>Your one-stop destination for government job updates, results, admit cards, schemes and important links.</p><small>Independent information portal.</small></div><div><h2>Quick Links</h2>{navigation.slice(1, 6).map(([path, label]) => <Link key={path} to={path}>{label}</Link>)}</div><div><h2>Popular Categories</h2><div className="footer-categories">{['UP Police', 'SSC', 'Banking', 'Railway', 'Teaching', 'Defence', 'State Government', 'Engineering'].map(term => <Link key={term} to={`/search?q=${encodeURIComponent(term)}`}>{term} Jobs</Link>)}</div></div><div><h2>Explore SarkariLinks</h2><Link to="/schemes">Government Schemes</Link><Link to="/search">All Updates</Link><Link to="/syllabus">Exam Syllabus</Link><a href="/#tools">Tools &amp; Services</a></div><div className="footer-note"><h2>Before You Apply</h2><p>Always verify eligibility, fees and deadlines in the official notification.</p><p>We do not accept government applications or collect application fees.</p></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} SarkariLinks. All rights reserved.</span><span>Government opportunities. Clearly connected.</span></div></footer>;
}
