import ChoiceSwitch from '../../components/ChoiceSwitch';
import { useLayoutEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getJson } from '../../api/content';
import { staffApi } from '../../api/session';

export interface Appearance { home_layout?: string; theme: string; text_size: string; version: number; }
export function useAppearance() { return useQuery({ queryKey: ['appearance'], queryFn: () => getJson<{ data: Appearance }>('/appearance'), staleTime: 30_000, refetchInterval: 60_000 }); }
export function AppearanceRoot() {
  const { data } = useAppearance();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.homeLayout = 'compact-cards';
    root.dataset.theme = 'modern';
    root.dataset.textSize = data?.data.text_size ?? root.dataset.textSize ?? 'standard';
  }, [data?.data.text_size]);
  return null;
}

export default function AppearanceManagement() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-appearance'], queryFn: () => staffApi<{ data: Appearance }>('/admin/appearance'), staleTime: Infinity });
  const save = useMutation({ mutationFn: (body: Pick<Appearance, 'text_size' | 'version'>) => staffApi<{ data: Appearance }>('/admin/appearance', 'PUT', body), onSuccess: result => { client.setQueryData(['admin-appearance'], result); client.setQueryData(['appearance'], result); } });
  return <section className="panel admin-panel appearance-management">
    <div className="section-title"><div><span className="eyebrow">SUPERADMIN CONTROLS</span><h2>Homepage appearance</h2><p>One consistent portal design: compact notice cards, clear search, deep teal navigation and teal actions across every page.</p></div><button className="secondary" disabled={query.isFetching} onClick={() => { save.reset(); void query.refetch(); }}>Reload saved settings</button></div>
    {query.isPending && <p role="status">Loading reading preferences...</p>}
    {query.error && <p role="alert" className="admin-error">{query.error.message}</p>}
    {query.data && <ReadingForm key={query.data.data.version} current={query.data.data} pending={save.isPending} apply={body => save.mutate(body)} />}
    {save.error && <p role="alert" className="admin-error">{save.error.message}</p>}
    {save.isSuccess && <p className="admin-success" role="status">Reading size saved for all visitors.</p>}
    <p className="appearance-guidance">Only administrators with Settings permission can change reading size. Changes are recorded in audit history.</p>
  </section>;
}

function ReadingForm({ current, pending, apply }: { current: Appearance; pending: boolean; apply: (body: Pick<Appearance, 'text_size' | 'version'>) => void }) {
  const [textSize, setTextSize] = useState(current.text_size);
  return <form onSubmit={event => { event.preventDefault(); apply({ text_size: textSize, version: current.version }); }}><div className="appearance-bottom"><ChoiceSwitch label="Reading size" value={textSize} disabled={pending} onChange={setTextSize} options={[["standard", "Standard"], ["large", "Larger"]]} /><button disabled={pending || textSize === current.text_size}>{pending ? 'Saving...' : 'Save reading size'}</button></div></form>;
}
