import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { staffApi } from '../../api/session';
import type { Page } from '../../api/content';
import type { PortalTool } from '../tools/Tools';
import { toolCatalog } from '../tools/catalog';
import { useMemberSession } from '../account/Account';

const storageKey = 'sarkarilinks.recent-tools.v1', eventName = 'portal-recent-tools-changed';
function readRecent(): string[] { try { const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && Object.hasOwn(toolCatalog, item)))].slice(0, 4) : []; } catch { return []; } }
export function rememberTool(slug: string) {
  if (!Object.hasOwn(toolCatalog, slug)) return;
  try { localStorage.setItem(storageKey, JSON.stringify([slug, ...readRecent().filter(value => value !== slug)].slice(0, 4))); window.dispatchEvent(new Event(eventName)); } catch { /* Tool use still works when browser storage is disabled. */ }
}
export default function ReturnVisit({ tools }: { tools: PortalTool[] }) {
  const session = useMemberSession(), [recent, setRecent] = useState(readRecent), user = session.data?.data;
  useEffect(() => { const update = () => setRecent(readRecent()); window.addEventListener(eventName, update); window.addEventListener('storage', update); return () => { window.removeEventListener(eventName, update); window.removeEventListener('storage', update); }; }, []);
  const saved = useQuery({ queryKey: ['bookmarks', 'home'], queryFn: () => staffApi<Page>('/account/bookmarks'), enabled: !!user });
  const available = recent.flatMap(slug => { const tool = tools.find(item => item.slug === slug); return tool ? [tool] : []; });
  if (!user && !available.length) return null;
  return <section className="return-visit" aria-labelledby="return-title"><div className="return-heading"><div><span className="eyebrow">{user ? `WELCOME BACK, ${user.name.split(' ')[0]}` : 'WELCOME BACK'}</span><h2 id="return-title">Pick up where you left off</h2><p>Your shortcuts, without starting over.</p></div>{user && <Link className="button secondary" to="/account">Open my workspace</Link>}</div>{user && <div className="return-shortcuts"><Link to="/account?tab=for-you"><strong>Jobs for you</strong><span>Use your saved preferences →</span></Link><Link to="/account?tab=saved"><strong>Saved jobs{saved.data ? ` (${saved.data.meta.total})` : ''}</strong><span>Return to your shortlist →</span></Link><Link to="/account?tab=preferences"><strong>Update preferences</strong><span>State, qualification & language →</span></Link></div>}{available.length > 0 && <div className="recent-tools"><div className="recent-tools-heading"><h3>Recently opened tools</h3><button className="text-button" onClick={() => { try { localStorage.removeItem(storageKey); } catch { /* Disabled storage. */ } setRecent([]); window.dispatchEvent(new Event(eventName)); }}>Clear recent tools</button></div><div className="recent-tool-links">{available.map(tool => <Link key={tool.slug} to={`/tools/${tool.slug}`}><span aria-hidden="true">{toolCatalog[tool.slug].icon}</span>{tool.name}<span aria-hidden="true">↗</span></Link>)}</div><small>Tool names are remembered on this device. File contents and form inputs are not stored in this history.</small></div>}</section>;
}
