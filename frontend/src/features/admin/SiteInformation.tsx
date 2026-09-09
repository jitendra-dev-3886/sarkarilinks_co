import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { staffApi } from '../../api/session';
import { informationLinks, type InformationPage } from '../pages/SitePages';

interface Settings { version: number; document: { owner: string; support_email: string; address: string; pages: Record<string, InformationPage> }; }
export default function SiteInformation() {
  const [selected, setSelected] = useState('about-us');
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['admin-site-information'], queryFn: () => staffApi<{ data: Settings }>('/admin/site-information'), staleTime: Infinity });
  const save = useMutation({ mutationFn: (body: Settings) => staffApi<{ data: Settings }>('/admin/site-information', 'PUT', body), onSuccess: data => { client.setQueryData(['admin-site-information'], data); void client.invalidateQueries({ queryKey: ['site-page'] }); } });
  return <section className="panel admin-panel site-settings"><div className="section-title"><div><h2>Site information</h2><p>Update the public business details and page text. Changes apply to everyone and are audited.</p></div><button className="secondary" disabled={query.isFetching || save.isPending} onClick={() => { save.reset(); void query.refetch(); }}>Reload saved settings</button></div>{query.isPending && <p role="status">Loading settings…</p>}{query.error && <p role="alert">{query.error.message}</p>}{query.data && <Editor key={query.data.data.version} current={query.data.data} selected={selected} setSelected={setSelected} save={body => save.mutate(body)} pending={save.isPending} />}{save.error && <p role="alert" className="admin-error">{save.error.message}</p>}{save.isSuccess && <p role="status" className="admin-success">Site information saved and audited.</p>}</section>;
}
function Editor({ current, save, pending, selected, setSelected }: { current: Settings; save: (body: Settings) => void; pending: boolean; selected: string; setSelected: (slug: string) => void }) {
  const [document, setDocument] = useState(current.document);
  const page = document.pages[selected];
  function updatePage(value: Partial<InformationPage>) { setDocument({ ...document, pages: { ...document.pages, [selected]: { ...page, ...value } } }); }
  const changed = JSON.stringify(document) !== JSON.stringify(current.document);
  return <form className="site-information-editor" onSubmit={event => { event.preventDefault(); save({ version: current.version, document }); }}>
    <fieldset className="site-settings-fields" disabled={pending}>
      <legend className="sr-only">Website information settings</legend>
      <section className="site-business-card"><div className="site-card-heading"><span className="eyebrow">SHARED ACROSS YOUR WEBSITE</span><h3>Public business details</h3><p>Keep your identity and contact information in one place.</p></div><div className="form-grid"><label>Site operator / business name<input value={document.owner} maxLength={180} onChange={event => setDocument({ ...document, owner: event.target.value })} /></label><label>Public support email<input type="email" value={document.support_email} maxLength={254} onChange={event => setDocument({ ...document, support_email: event.target.value })} /></label></div><label>Public address (optional)<textarea rows={2} value={document.address} maxLength={1000} onChange={event => setDocument({ ...document, address: event.target.value })} /></label></section>
      <div className="site-page-workspace"><nav className="site-page-picker" aria-label="Page to edit"><span className="eyebrow">WEBSITE PAGES</span>{informationLinks.map(([slug, label]) => <button key={slug} type="button" aria-pressed={selected === slug} onClick={() => setSelected(slug)}><span>{label}</span><small>{document.pages[slug].review_required ? 'Draft' : 'Public'}</small></button>)}</nav>
      <section className="site-page-editor"><div className="site-page-heading"><div><span className="eyebrow">PAGE EDITOR</span><h3>{informationLinks.find(([slug]) => slug === selected)?.[1]}</h3></div><Link className="button secondary" to={`/${selected}`} target="_blank" rel="noopener noreferrer">Open published page <span aria-hidden="true">&#8599;</span></Link></div>
      <div className="site-page-metadata"><div><label>Page title<input aria-describedby="site-title-count" required maxLength={120} value={page.title} onChange={event => updatePage({ title: event.target.value })} /></label><small id="site-title-count">{page.title.length}/120 characters</small></div><div><label>Search description<textarea aria-describedby="site-description-count" rows={3} required maxLength={250} value={page.description} onChange={event => updatePage({ description: event.target.value })} /></label><small id="site-description-count">{page.description.length}/250 characters</small></div></div>
      <div className="site-section-heading"><h3>Content sections</h3><span>{page.sections.length}/20 sections</span></div>
      {page.sections.map((section, index) => <section className="information-section-editor" key={`${selected}-${index}`}><div className="site-section-heading"><h4>Section {index + 1}</h4><button className="text-button" type="button" onClick={() => updatePage({ sections: page.sections.filter((_, i) => i !== index) })}>Remove section {index + 1}</button></div><label>Section {index + 1} heading<input required maxLength={180} value={section.heading} onChange={event => updatePage({ sections: page.sections.map((item, i) => i === index ? { ...item, heading: event.target.value } : item) })} /></label><label>Section {index + 1} text<textarea required rows={5} maxLength={10000} value={section.text} onChange={event => updatePage({ sections: page.sections.map((item, i) => i === index ? { ...item, text: event.target.value } : item) })} /></label></section>)}
      <button className="secondary" type="button" disabled={page.sections.length >= 20} onClick={() => updatePage({ sections: [...page.sections, { heading: '', text: '' }] })}>Add section</button>
      <div className="site-publishing"><h3>Publishing status</h3><label className="review-policy"><input type="checkbox" checked={page.review_required ?? false} onChange={event => updatePage({ review_required: event.target.checked })} /><span>Mark as draft awaiting operator review</span></label><p>Draft pages remain viewable, but are excluded from the sitemap and marked noindex. Review the content before publishing. Page text is plain text.</p></div>
      </section></div>
    </fieldset>
    <div className="site-save-bar"><div><strong>{changed ? 'Unsaved changes' : 'All changes saved'}</strong><p>Save applies business details and edits across all pages. Opening a published page shows the saved version.</p></div><button disabled={pending || !changed}>{pending ? 'Saving...' : 'Save site information'}</button></div>
  </form>;
}
