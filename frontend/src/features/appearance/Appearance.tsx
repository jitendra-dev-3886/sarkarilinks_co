import { useLayoutEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { getJson } from '../../api/content';
import { staffApi } from '../../api/session';
import { useMemberSession } from '../account/Account';

export const designs = [
  { id: 'ocean', name: 'Ocean', label: '01 / Balanced portal', description: 'Split introduction with a task panel, followed by a balanced job-card grid. A clear starting point for new visitors.', font: 'System sans-serif', layout: 'split' },
  { id: 'forest', name: 'Forest', label: '02 / Jobs workspace', description: 'Wide job workspace beside an exam-update sidebar. Designed for comparing opportunities and checking progress.', font: 'System sans-serif', layout: 'spacious' },
  { id: 'studio', name: 'Studio', label: '03 / Search first', description: 'Centered search, generous task tiles and application-tool cards. Useful when visitors know what they need.', font: 'System sans-serif', layout: 'centered' },
  { id: 'editorial', name: 'Editorial', label: '04 / Daily bulletin', description: 'Compact masthead, editorial job rows and three exam columns. A newspaper-inspired view for regular notice readers.', font: 'Georgia headings + system body', layout: 'list' },
  { id: 'focus', name: 'Focus', label: '05 / Quick list', description: 'A slim introduction, stacked notices and simple job rows. Fewer large panels for visitors who prefer a direct list.', font: 'System sans-serif', layout: 'minimal' },
] as const;
export interface Appearance { home_layout?: 'theme' | 'classic' | 'classic-quick'; theme: string; text_size: string; version: number; }
export function useAppearance() { return useQuery({ queryKey: ['appearance'], queryFn: () => getJson<{ data: Appearance }>('/appearance'), staleTime: 30_000, refetchInterval: 60_000 }); }

export function useHomeLayout() {
  const query = useAppearance(), session = useMemberSession(), location = useLocation();
  const params = new URLSearchParams(location.search);
  const preview = location.pathname === '/' && designs.some(design => design.id === params.get('theme-preview')) && session.data?.data?.roles.includes('administrator') && session.data.data.permissions.includes('settings.manage');
  return preview ? (['classic', 'classic-quick'].includes(params.get('layout-preview') ?? '') ? params.get('layout-preview')! : 'theme') : query.data?.data.home_layout ?? document.documentElement.dataset.homeLayout ?? 'theme';
}

export function AppearanceRoot() {
  const query = useAppearance(), session = useMemberSession(), location = useLocation();
  const params = new URLSearchParams(location.search), candidate = params.get('theme-preview');
  const preview = location.pathname === '/' && designs.some(design => design.id === candidate) && session.data?.data?.roles.includes('administrator') && session.data?.data?.permissions.includes('settings.manage');
  const live = query.data?.data;
  const layout = useHomeLayout();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.homeLayout = layout;
    root.dataset.theme = preview ? candidate! : live?.theme ?? root.dataset.theme ?? 'ocean';
    root.dataset.textSize = preview ? (params.get('text-preview') === 'large' ? 'large' : 'standard') : live?.text_size ?? root.dataset.textSize ?? 'standard';
    // Prevent a preview from becoming the fallback when navigating away before the API responds.
    return () => { if (preview) { root.dataset.homeLayout = live?.home_layout ?? 'theme'; root.dataset.theme = live?.theme ?? 'ocean'; root.dataset.textSize = live?.text_size ?? 'standard'; } };
  }, [layout, preview, candidate, live?.theme, live?.text_size, location.search]);
  return preview ? <div className="appearance-preview-banner" role="status"><span>Preview only: <strong>{designs.find(design => design.id === candidate)?.name}</strong>. Visitors still see the saved design.</span><Link to="/admin?tab=appearance">Back to appearance settings</Link></div> : null;
}

export default function AppearanceManagement() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-appearance'], queryFn: () => staffApi<{ data: Appearance }>('/admin/appearance'), staleTime: Infinity });
  const save = useMutation({ mutationFn: (body: Appearance) => staffApi<{ data: Appearance }>('/admin/appearance', 'PUT', body), onSuccess: result => { client.setQueryData(['admin-appearance'], result); client.setQueryData(['appearance'], result); } });
  return <section className="panel admin-panel appearance-management"><div className="section-title"><div><span className="eyebrow">SUPERADMIN CONTROLS</span><h2>Homepage appearance</h2><p>Choose a theme layout or the sixth option, Classic notice board, with any color palette. Preview the full page before applying; the main navigation stays consistent.</p></div><button className="secondary" disabled={query.isFetching} onClick={() => { save.reset(); void query.refetch(); }}>Reload saved settings</button></div>{query.isPending && <p role="status">Loading the saved design...</p>}{query.error && <p role="alert" className="admin-error">{query.error.message}</p>}{query.data && <AppearanceForm key={query.data.data.version} current={query.data.data} pending={save.isPending} apply={body => save.mutate(body)} />}{save.error && <p role="alert" className="admin-error">{save.error.message}</p>}{save.isSuccess && <p className="admin-success" role="status">Design saved for all visitors. This change is recorded in audit history.</p>}<p className="appearance-guidance">The existing Administrator role is the superadmin role for this project. Only that role with Settings permission can apply changes. Previewing does not change the public homepage.</p></section>;
}

function AppearanceForm({ current, pending, apply }: { current: Appearance; pending: boolean; apply: (body: Appearance) => void }) {
  const [layout, setLayout] = useState(current.home_layout ?? 'theme');
  const [theme, setTheme] = useState(current.theme), [textSize, setTextSize] = useState(current.text_size);
  return <form onSubmit={event => { event.preventDefault(); apply({ home_layout: layout, theme, text_size: textSize, version: current.version }); }}><fieldset className="design-fieldset" disabled={pending}><legend>Choose a homepage design</legend><div className="design-options">{designs.map(design => <label className={`design-option ${theme === design.id ? 'is-selected' : ''}`} key={design.id}><span className={`design-thumbnail thumbnail-${design.layout}`} data-theme={design.id} aria-hidden="true"><span className="thumbnail-nav"><i /><i /><i /></span><span className="thumbnail-hero"><span><b /><b /><i /></span><span /></span><span className="thumbnail-cards"><i /><i /><i /></span></span><span className="design-choice"><input type="radio" name="theme" value={design.id} checked={theme === design.id} onChange={() => setTheme(design.id)} aria-label={design.name} /><strong>{design.name}</strong>{current.theme === design.id && <span className="live-design">Live</span>}</span><span className="design-label">{design.label}</span><span className="design-description">{design.description}</span><small>{design.font}</small></label>)}</div></fieldset><div className="classic-layout-choice"><label>Homepage structure<select value={layout === 'classic-quick' ? 'classic' : layout} disabled={pending} onChange={event => setLayout(event.target.value as 'theme' | 'classic' | 'classic-quick')}><option value="theme">Use selected theme layout</option><option value="classic">06 / Classic notice board</option></select></label>{layout !== 'theme' && <label>Classic homepage banner<select value={layout} disabled={pending} onChange={event => setLayout(event.target.value as 'classic' | 'classic-quick')}><option value="classic">Search banner</option><option value="classic-quick">Quick start banner</option></select><small>Optional: replace only the top search block with direct task links.</small></label>}<p>Classic notice board: compact search, category shortcuts and three columns of linked notices. Uses the selected theme colors and logo.</p></div><div className="appearance-bottom"><label className="appearance-size">Reading size<select value={textSize} disabled={pending} onChange={event => setTextSize(event.target.value)}><option value="standard">Standard · 16 px body / inputs</option><option value="large">Larger · 18 px body / inputs</option></select><small>Both allow browser zoom. Secondary labels remain at least 12 px at the standard size.</small></label><div className="appearance-actions"><Link className="button secondary" to={`/?theme-preview=${theme}&text-preview=${textSize}&layout-preview=${layout}`} target="_blank" rel="noopener noreferrer">Preview homepage ↗</Link><button disabled={pending || (layout === (current.home_layout ?? 'theme') && theme === current.theme && textSize === current.text_size)}>{pending ? 'Saving design...' : 'Apply design to website'}</button></div></div></form>;
}
