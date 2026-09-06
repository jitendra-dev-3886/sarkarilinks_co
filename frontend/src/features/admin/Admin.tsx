import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { staffApi, type StaffUser } from '../../api/session';
import { categories } from '../../api/content';
import './admin.css';
import Advertisements, { detailLabels } from './Advertisements';
import { Operations, Taxonomy, TermFields, ToolManagement } from './WorkspacePanels';
import AppearanceManagement from '../appearance/Appearance';

export function useSession() {
  return useQuery({ queryKey: ['session'], queryFn: () => staffApi<{ data: StaffUser | null }>('/session'), staleTime: 0, retry: false });
}

export function Login() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: { email: string; password: string }) => staffApi<{ data: StaffUser }>('/session', 'POST', body),
    onSuccess: async () => { await client.invalidateQueries(); navigate('/admin'); },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({ email: String(form.get('email')), password: String(form.get('password')) });
  }
  return <section className="login-panel panel"><span className="eyebrow">SARKARILINKS WORKSPACE</span><h1>Staff sign in</h1><p>Manage verified updates, reviews and publishing.</p><form onSubmit={submit}><label>Email address<input required name="email" type="email" autoComplete="username" /></label><label>Password<input required name="password" type="password" autoComplete="current-password" /></label>{mutation.error && <p className="admin-error" role="alert">{mutation.error.message}</p>}<button disabled={mutation.isPending}>{mutation.isPending ? 'Signing in…' : 'Sign in'}</button></form><Link to="/">← Back to the portal</Link></section>;
}

interface RecordItem { has_advertisement?: boolean; details?: Record<string, string>; term_ids?: number[]; id: number; title: string; type: string; status: string; author_id: number; locale: string; slug: string; summary: string; body: string; organization: string; source_url: string; closing_date: string | null; expires_at: string | null; }
interface Page<T> { data: T[]; current_page: number; last_page: number; total: number; }
interface Role { id: number; name: string; label: string; permissions: string[]; }
const statuses = ['draft', 'in_review', 'approved', 'scheduled', 'published', 'archived'];

export default function Admin() {
  const session = useSession();
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') === 'appearance' ? 'appearance' : 'content');
  const client = useQueryClient();
  const navigate = useNavigate();
  const logout = useMutation({ mutationFn: () => staffApi('/session', 'DELETE'), onSuccess: () => { client.clear(); navigate('/login'); } });
  if (session.isPending) return <p role="status">Loading your workspace…</p>;
  if (session.error) return <div className="admin-error" role="alert">{session.error.message}<button onClick={() => void session.refetch()}>Retry</button></div>;
  const user = session.data?.data;
  if (!user) return <section className="panel admin-gate"><h1>Sign in to your workspace</h1><p>Your staff account determines the content and actions you can access.</p><Link className="button" to="/login">Staff sign in</Link></section>;
  if (!user.permissions.includes('cms.access')) return <section className="panel admin-gate"><h1>Staff access required</h1><p>Your account has no administration permissions.</p><button onClick={() => logout.mutate()}>Sign out</button></section>;
  const canViewContent = categories.some(([type]) => user.permissions.includes(`${type}.view`));
  const activeTab = tab === 'content' && !canViewContent ? (user.permissions.includes('operations.view') ? 'operations' : user.permissions.includes('tools.manage') ? 'tools' : 'content') : tab;
  return <div className="admin-workspace"><div className="admin-heading"><div><span className="eyebrow">EDITORIAL WORKSPACE</span><h1>Content &amp; administration</h1><p>{user.name} <span className="role-badge">{user.roles.join(', ')}</span></p></div><button className="secondary" onClick={() => logout.mutate()} disabled={logout.isPending}>Sign out</button></div>{logout.error && <p className="admin-error" role="alert">{logout.error.message}</p>}<nav className="admin-tabs" aria-label="Workspace sections">{[['content', 'Content', canViewContent ? 'cms.access' : 'content.unavailable'], ['advertisements', 'Advertisement imports', user.permissions.includes('media.manage') ? 'media.manage' : 'media.upload'], ['taxonomy', 'Taxonomy', 'taxonomy.manage'], ['operations', 'Operations', 'operations.view'], ['tools', 'Manage tools', 'tools.manage'], ['appearance', 'Homepage appearance', user.roles.includes('administrator') ? 'settings.manage' : 'appearance.unavailable'], ['users', 'Users & roles', 'users.manage'], ['roles', 'Permission matrix', 'roles.view'], ['audit', 'Audit history', 'audit.view']].filter(([, , permission]) => user.permissions.includes(permission)).map(([key, label]) => <button key={key} type="button" aria-pressed={activeTab === key} className={activeTab === key ? 'selected' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>{activeTab === 'content' && <ContentWorkspace user={user} />}{activeTab === 'advertisements' && <Advertisements user={user} />}{activeTab === 'taxonomy' && <Taxonomy />}{activeTab === 'operations' && <Operations />}{activeTab === 'tools' && <ToolManagement />}{activeTab === 'appearance' && user.roles.includes('administrator') && user.permissions.includes('settings.manage') && <AppearanceManagement />}{activeTab === 'users' && user.permissions.includes('users.manage') && <Users />}{activeTab === 'roles' && user.permissions.includes('roles.view') && <Roles />}{activeTab === 'audit' && user.permissions.includes('audit.view') && <Audit />}</div>;
}

function ContentWorkspace({ user }: { user: StaffUser }) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<RecordItem | 'new' | null>(null);
  const [actionTarget, setActionTarget] = useState<{ item: RecordItem; action: string } | null>(null);
  const [message, setMessage] = useState('');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-content', status, page], queryFn: () => staffApi<Page<RecordItem>>(`/admin/content?page=${page}${status ? `&status=${status}` : ''}`) });
  const transition = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: unknown }) => staffApi(`/admin/content/${id}/transitions`, 'POST', payload),
    onSuccess: async () => { setActionTarget(null); setMessage('Content status updated. The change has been recorded in audit history.'); await client.invalidateQueries(); },
  });
  function actions(item: RecordItem): string[] {
    const permitted = (action: string) => user.permissions.includes(`${item.type}.${action}`);
    if (item.status === 'draft' && permitted('update') && (item.author_id === user.id || user.roles.includes('administrator'))) return ['submit'];
    if (item.status === 'in_review' && permitted('review') && item.author_id !== user.id) return ['return', 'approve'];
    if (item.status === 'approved' && permitted('publish') && item.author_id !== user.id) return ['publish', 'schedule'];
    if (['published', 'scheduled'].includes(item.status) && permitted('archive')) return ['archive'];
    return [];
  }
  return <section className="panel admin-panel"><div className="admin-toolbar"><label>Status <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></label>{user.permissions.some(p => p.endsWith('.create')) && <button onClick={() => { setEditing('new'); setMessage(''); }}>+ New draft</button>}</div>{message && <p role="status" className="admin-success">{message}</p>}{editing && <ContentEditor key={editing === 'new' ? 'new' : editing.id} item={editing} user={user} close={() => setEditing(null)} saved={() => { setEditing(null); setMessage('Draft saved. Submit it when ready for review.'); void client.invalidateQueries(); }} />}{query.isPending && <p role="status">Loading content…</p>}{query.error && <p role="alert" className="admin-error">{query.error.message}</p>}{query.data && <><div className="admin-table-wrap"><table><thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>{query.data.data.map(item => <tr key={item.id}><td><button className="record-title" onClick={() => setEditing(item)}>{item.title}</button><small>/{item.type}/{item.slug}</small></td><td>{item.type}</td><td><span className={`status-badge status-${item.status}`}>{item.status.replace('_', ' ')}</span></td><td><div className="row-actions">{actions(item).map(action => <button className="secondary" key={action} onClick={() => { transition.reset(); setActionTarget({ item, action }); }}>{action}</button>)}{item.status === 'published' && <Link to={`/${item.type}/${item.slug}${item.locale === 'hi' ? '?locale=hi' : ''}`}>View public page ↗</Link>}</div></td></tr>)}</tbody></table></div>{!query.data.data.length && <p className="feedback">No content in this view. Authors can create a draft; reviewers will see submissions when they arrive.</p>}<Pager page={query.data} setPage={setPage} /></>}{actionTarget && <div className="action-review"><h2>{actionTarget.action} “{actionTarget.item.title}”</h2><p>{actionTarget.action === 'approve' ? 'Confirm that you have checked the official source, dates and accuracy. Approval records you as the reviewer.' : 'Confirm this workflow change. It will be recorded in audit history.'}</p><form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); const time = String(data.get('published_at') ?? ''); transition.mutate({ id: actionTarget.item.id, payload: { action: actionTarget.action, reason: data.get('reason') || null, published_at: time ? new Date(time).toISOString() : null } }); }}><label>Reason / review notes<textarea name="reason" required={['return', 'archive'].includes(actionTarget.action)} minLength={5} maxLength={2000} /></label>{actionTarget.action === 'schedule' && <label>Publication time (your local timezone)<input type="datetime-local" name="published_at" required /></label>}{transition.error && <p className="admin-error" role="alert">{transition.error.message}</p>}<div className="row-actions"><button disabled={transition.isPending}>Confirm {actionTarget.action}</button><button type="button" className="secondary" onClick={() => setActionTarget(null)}>Cancel</button></div></form></div>}</section>;
}

function ContentEditor({ item, user, close, saved }: { item: RecordItem | 'new'; user: StaffUser; close: () => void; saved: () => void }) {
  const record = item === 'new' ? null : item;
  const [locale, setLocale] = useState(record?.locale ?? 'en');
  const canEdit = !record || (record.status === 'draft' && user.permissions.includes(`${record.type}.update`) && (record.author_id === user.id || user.roles.includes('administrator')));
  const mutation = useMutation({ mutationFn: (body: unknown) => staffApi(record ? `/admin/content/${record.id}` : '/admin/content', record ? 'PUT' : 'POST', body), onSuccess: saved });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries([...data].filter(([key]) => !key.startsWith('details.') && key !== 'term_ids'));
    const details = Object.fromEntries(Object.keys(detailLabels).map(key => [key, data.get(`details.${key}`) || '']));
    mutation.mutate({ ...values, details, term_ids: data.getAll('term_ids').map(Number), closing_date: values.closing_date || null, ...(record ? { type: record.type, locale: record.locale } : {}) });
  }
  return <div className="content-editor"><div className="admin-toolbar"><h2>{record ? (canEdit ? 'Edit draft' : 'Content preview') : 'Create draft'}</h2><button className="secondary" onClick={close}>Close</button></div><form onSubmit={submit}><fieldset disabled={!canEdit || mutation.isPending}><div className="form-grid"><label>Content type<select name="type" defaultValue={record?.type ?? categories.find(([type]) => user.permissions.includes(`${type}.create`))?.[0]} disabled={!!record}>{categories.filter(([type]) => record || user.permissions.includes(`${type}.create`)).map(([type, label]) => <option value={type} key={type}>{label}</option>)}</select></label><label>Language<select name="locale" value={locale} onChange={e => setLocale(e.target.value)} disabled={!!record}><option value="en">English</option><option value="hi">Hindi</option></select></label><label>Title<input name="title" required maxLength={255} defaultValue={record?.title} /></label><label>URL slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={180} defaultValue={record?.slug} placeholder="exam-recruitment-2026" /></label><label>Issuing organization<input name="organization" required maxLength={255} defaultValue={record?.organization} /></label><label>Official source URL<input name="source_url" required type="url" maxLength={2048} defaultValue={record?.source_url} /></label><label>Closing date (India)<input type="date" name="closing_date" defaultValue={record?.closing_date?.slice(0, 10)} /></label></div><label>Summary<textarea name="summary" required maxLength={2000} defaultValue={record?.summary} rows={3} /></label><TermFields key={locale} locale={locale} selected={record?.term_ids} /><div className="form-grid">{Object.entries(detailLabels).map(([key, label]) => <label key={key}>{label}<textarea name={`details.${key}`} defaultValue={record?.details?.[key]} rows={3} maxLength={key === 'vacancies' ? 2000 : key === 'fees' ? 5000 : 10000} /></label>)}</div><label>Notice details<textarea name="body" required maxLength={100000} defaultValue={record?.body} rows={9} /></label></fieldset>{record?.has_advertisement && <p><a href={`/api/v1/admin/content/${record.id}/advertisement`}>Download uploaded advertisement</a></p>}{record && <a href={record.source_url} target="_blank" rel="noopener noreferrer">Open official source ↗</a>}{mutation.error && <p role="alert" className="admin-error">{mutation.error.message}</p>}{canEdit && <button disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save draft'}</button>}</form></div>;
}

function Users() {
  const [page, setPage] = useState(1);
  const users = useQuery({ queryKey: ['admin-users', page], queryFn: () => staffApi<Page<{ id: number; name: string; email: string; roles: Role[] }>>(`/admin/users?page=${page}`) });
  const roles = useQuery({ queryKey: ['admin-roles'], queryFn: () => staffApi<{ data: Role[] }>('/admin/roles') });
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: ({ id, roles }: { id: number; roles: string[] }) => staffApi(`/admin/users/${id}/roles`, 'PUT', { roles }), onSuccess: () => { void client.invalidateQueries(); } });
  return <section className="panel admin-panel"><h2>Assign user roles</h2><CreateUser roles={roles.data?.data ?? []} /><p>Changes take effect on the next request. Another administrator must change your own roles.</p>{(users.error || roles.error || mutation.error) && <p className="admin-error" role="alert">{users.error?.message ?? roles.error?.message ?? mutation.error?.message}</p>}{mutation.isSuccess && <p role="status" className="admin-success">Roles updated and audited.</p>}{users.isPending && <p role="status">Loading users…</p>}{users.data?.data.map(user => <form key={user.id + user.roles.map(r => r.name).join()} className="user-role-form" onSubmit={event => { event.preventDefault(); mutation.mutate({ id: user.id, roles: new FormData(event.currentTarget).getAll('roles').map(String) }); }}><div><strong>{user.name}</strong><small>{user.email}</small></div><div className="role-options">{roles.data?.data.map(role => <label key={role.id}><input type="checkbox" name="roles" value={role.name} defaultChecked={user.roles.some(r => r.id === role.id)} />{role.label}</label>)}</div><button disabled={mutation.isPending}>Save roles</button></form>)}{users.data && <Pager page={users.data} setPage={setPage} />}</section>;
}

function Roles() {
  const query = useQuery({ queryKey: ['admin-roles'], queryFn: () => staffApi<{ data: Role[] }>('/admin/roles') });
  return <section className="panel admin-panel"><h2>Role permission matrix</h2><p>Server-enforced grants. Ownership and independent review rules apply in addition to these permissions.</p>{query.error && <p role="alert" className="admin-error">{query.error.message}</p>}<RoleEditor roles={query.data?.data ?? []} /><div className="permission-grid">{query.data?.data.map(role => <article key={role.id}><h3>{role.label}</h3><ul>{role.permissions.length ? role.permissions.map(permission => <li key={permission}>{permission}</li>) : <li>Public account access only</li>}</ul></article>)}</div></section>;
}

function Audit() {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['admin-audit', page], queryFn: () => staffApi<Page<{ id: string; actor_id: number | null; action: string; target_id: string; created_at: string; reason: string | null; before: string | null; after: string | null }>>(`/admin/audit?page=${page}`) });
  return <section className="panel admin-panel"><h2>Immutable audit history</h2><p>Content and role changes are recorded here. Records cannot be edited or deleted.</p>{query.error && <p className="admin-error" role="alert">{query.error.message}</p>}{query.data?.data.map(row => <details className="audit-row" key={row.id}><summary><strong>{row.action}</strong> · Target {row.target_id} · {row.actor_id ? `User ${row.actor_id}` : 'System'} <small>{row.created_at} UTC</small></summary>{row.reason && <p>{row.reason}</p>}<div className="audit-diff"><div><h3>Before</h3><pre>{row.before ? JSON.stringify(JSON.parse(row.before), null, 2) : '—'}</pre></div><div><h3>After</h3><pre>{row.after ? JSON.stringify(JSON.parse(row.after), null, 2) : '—'}</pre></div></div></details>)}{query.data && <Pager page={query.data} setPage={setPage} />}</section>;
}

function Pager({ page, setPage }: { page: { current_page: number; last_page: number; total: number }; setPage: (page: number) => void }) {
  return <div className="pagination"><button className="secondary" disabled={page.current_page <= 1} onClick={() => setPage(page.current_page - 1)}>Previous</button><span>Page {page.current_page} / {page.last_page} · {page.total} records</span><button className="secondary" disabled={page.current_page >= page.last_page} onClick={() => setPage(page.current_page + 1)}>Next</button></div>;
}

function CreateUser({ roles }: { roles: Role[] }) {
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: (body: unknown) => staffApi('/admin/users', 'POST', body), onSuccess: () => { void client.invalidateQueries({ queryKey: ['admin-users'] }); } });
  return <details className="content-editor"><summary>Create a user account</summary><form onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); mutation.mutate({ ...data, email: String(data.email).toLowerCase(), roles: [data.role] }, { onSuccess: () => form.reset() }); }}><div className="form-grid"><label>Name<input name="name" required maxLength={255} /></label><label>Email<input name="email" type="email" required maxLength={255} /></label><label>Initial password<input name="password" type="password" required minLength={12} autoComplete="new-password" /></label><label>Role<select name="role">{roles.map(role => <option key={role.id} value={role.name}>{role.label}</option>)}</select></label></div><p>Use at least 12 characters with upper/lower case letters and numbers.</p>{mutation.error && <p role="alert" className="admin-error">{mutation.error.message}</p>}{mutation.isSuccess && <p role="status" className="admin-success">User created.</p>}<button disabled={mutation.isPending}>Create user</button></form></details>;
}

function RoleEditor({ roles }: { roles: Role[] }) {
  const session = useSession();
  const [selected, setSelected] = useState('');
  const client = useQueryClient();
  const permissions = useQuery({ queryKey: ['admin-permissions'], queryFn: () => staffApi<{ data: string[] }>('/admin/permissions') });
  const mutation = useMutation({ mutationFn: (body: unknown) => staffApi(`/admin/roles/${selected}/permissions`, 'PUT', body), onSuccess: () => { void client.invalidateQueries(); } });
  if (!session.data?.data?.permissions.includes('roles.manage')) return null;
  const editable = roles.filter(role => role.name !== 'administrator' && !session.data?.data?.roles.includes(role.name));
  const role = editable.find(role => String(role.id) === selected);
  return <details className="content-editor"><summary>Edit role permissions</summary><label>Role<select value={selected} onChange={event => { setSelected(event.target.value); mutation.reset(); }}><option value="">Select a role</option>{editable.map(role => <option value={role.id} key={role.id}>{role.label}</option>)}</select></label>{role && <form key={role.id + role.permissions.join()} onSubmit={event => { event.preventDefault(); mutation.mutate({ permissions: new FormData(event.currentTarget).getAll('permissions') }); }}><div className="role-options">{permissions.data?.data.map(permission => <label key={permission}><input type="checkbox" name="permissions" value={permission} defaultChecked={role.permissions.includes(permission)} />{permission}</label>)}</div><button disabled={mutation.isPending}>Save permissions</button></form>}{mutation.error && <p role="alert" className="admin-error">{mutation.error.message}</p>}{mutation.isSuccess && <p role="status" className="admin-success">Permissions updated and audited.</p>}</details>;
}
