import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getJson } from '../../api/content';
import type { Term } from '../admin/WorkspacePanels';

export default function ListingFilters() {
  const [params, setParams] = useSearchParams();
  const locale = params.get('locale') === 'hi' ? 'hi' : 'en';
  const query = useQuery({ queryKey: ['terms', locale], queryFn: () => getJson<{ data: Term[] }>(`/terms?locale=${locale}`) });
  const active = ['state', 'qualification', 'department', 'category', 'q', 'sort'].filter(key => params.has(key));
  function set(key: string, value: string) { setParams(previous => { const next = new URLSearchParams(previous); value ? next.set(key, value) : next.delete(key); next.delete('page'); return next; }); }
  return <div className="listing-filters panel"><div className="filter-controls"><label>Language<select value={locale} onChange={e => { const next = new URLSearchParams(); next.set('locale', e.target.value); setParams(next); }}><option value="en">English</option><option value="hi">हिन्दी</option></select></label>{['state', 'qualification', 'department', 'category'].map(group => <label key={group}>{group}<select value={params.get(group) ?? ''} onChange={e => set(group, e.target.value)}><option value="">All {group === 'category' ? 'categories' : group + 's'}</option>{params.has(group) && !query.data?.data.some(term => term.taxonomy === group && term.slug === params.get(group)) && <option value={params.get(group)!}>{params.get(group)}</option>}{query.data?.data.filter(term => term.taxonomy === group).map(term => <option value={term.slug} key={term.id}>{term.label}</option>)}</select></label>)}</div>{query.error && <p role="alert">Filter options could not be loaded. <button className="text-button" onClick={() => void query.refetch()}>Retry</button></p>}{active.length > 0 && <div className="active-filters"><span>Applied:</span>{active.map(key => <button className="filter-chip" key={key} onClick={() => set(key, '')} aria-label={`Remove ${key} filter`}>{params.get(key)} <span aria-hidden="true">×</span></button>)}<button className="text-button" onClick={() => setParams(locale === 'hi' ? { locale } : {})}>Clear all</button></div>}</div>;
}
