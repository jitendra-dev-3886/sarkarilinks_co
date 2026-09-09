import { Faq, LoadingState } from '../../components/Feedback';
import { lazy, Suspense, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getJson } from '../../api/content';
import { toolCatalog } from './catalog';
import Calculator from './Calculator';
import ToolIcon from './ToolIcon';
import { rememberTool } from '../home/ReturnVisit';
const PdfTools = lazy(() => import('./PdfTools'));
const ImageTools = lazy(() => import('./ImageTools'));
const ResumeBuilder = lazy(() => import('./ResumeBuilder'));
const MediaDownloader = lazy(() => import('./MediaDownloader'));
export interface PortalTool { slug: string; name: string; help: string; enabled?: boolean; }
export function ToolCard({ tool }: { tool: PortalTool }) {
  const info = toolCatalog[tool.slug];
  if (!info) return null;
  return <Link className="tool-card catalog-card" to={`/tools/${tool.slug}`}>
    <div className="catalog-card-header"><span className="catalog-icon"><ToolIcon category={info.category} /></span><div><span className="catalog-category">{info.category}</span><h3>{tool.name}</h3></div></div>
    <div className="catalog-card-body"><p>{info.description}</p></div>
    <div className="catalog-card-footer"><span className="catalog-processing">{tool.slug === 'media-downloader' ? 'Account required' : tool.slug === 'background-remover' ? 'Local AI' : 'On your device'}</span><span className="catalog-open">Open tool <span aria-hidden="true">&rarr;</span></span></div>
  </Link>;
}
export default function Tools() {
  const { tool: slug } = useParams();
  const [search, setSearch] = useState(''), [category, setCategory] = useState('All tools');
  const query = useQuery({ queryKey: ['tools'], queryFn: () => getJson<{ data: PortalTool[] }>('/tools') });
  useEffect(() => { if (slug && query.data?.data.some(tool => tool.slug === slug)) rememberTool(slug); }, [slug, query.data]);
  if (query.isPending) return <LoadingState label="Loading tools" />;
  if (query.error) return <div role="alert"><p>{query.error.message}</p><button onClick={() => void query.refetch()}>Try again</button></div>;
  const available = query.data?.data.filter(tool => tool.enabled !== false && toolCatalog[tool.slug]) ?? [];
  const tool = available.find(item => item.slug === slug), info = slug ? toolCatalog[slug] : null;
  if (slug) return tool && info ? <section className="tool-detail"><Link className="back-link" to="/tools">← All tools</Link><div className="tool-detail-heading"><span className="tool-icon"><ToolIcon category={info.category} /></span><div><span className="eyebrow">{info.category} · {slug === 'media-downloader' ? 'ACCOUNT REQUIRED' : 'PROCESSED ON YOUR DEVICE'}</span><h1>{tool.name}</h1><p>{info.description}</p></div></div><Suspense fallback={<p role="status">Opening your tool...</p>}>{['pdf-compressor', 'pdf-merge-split'].includes(slug) ? <PdfTools slug={slug} key={slug} /> : ['age', 'percentage', 'emi'].includes(slug) ? <Calculator tool={tool} /> : slug === 'resume-builder' ? <ResumeBuilder /> : slug === 'media-downloader' ? <MediaDownloader /> : <ImageTools slug={slug} key={slug} />}</Suspense><div className="tool-guide-grid"><section className="tool-how"><h2>How to use {tool.name.toLowerCase()}</h2><ol>{info.steps.map(step => <li key={step}>{step}</li>)}</ol><p>{tool.help}</p></section><Faq items={[{ question: 'Does this tool use AI?', answer: slug === 'background-remover' ? 'Yes. A local portrait segmentation model identifies people and removes the surrounding background. Always review the edges.' : slug === 'image-to-text' ? 'This tool uses OCR to recognize text. It does not generate or rewrite your document. Review the extracted text for mistakes.' : 'This is a utility, not a generative AI service. Results come from the file, values or text you provide.' }, { question: 'Where is my data processed?', answer: slug === 'media-downloader' ? 'Media jobs run on our server and require an account. Download prepared files within one hour.' : 'Processing runs in your browser. Resume fields are sent to your account only when you explicitly save them. Imported files are not uploaded.' }]} /></div><div className="section-title"><h2>Related application tools</h2><Link to="/tools">Explore all tools →</Link></div><div className="tool-grid related-tools">{available.filter(item => item.slug !== slug).sort((a, b) => Number(toolCatalog[b.slug].category === info.category) - Number(toolCatalog[a.slug].category === info.category)).slice(0, 3).map(item => <ToolCard key={item.slug} tool={item} />)}</div></section> : <section><h1>Tool unavailable</h1><p>This tool is not currently enabled.</p><Link to="/tools">Browse available tools</Link></section>;
  const filtered = available.filter(tool => (category === 'All tools' || toolCatalog[tool.slug].category === category) && `${tool.name} ${toolCatalog[tool.slug].description}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="tools-directory"><div className="tools-hero"><div className="catalog-intro"><span className="eyebrow">APPLICATION TOOLKIT</span><h1>Tools for your next application</h1><p>Prepare photos, documents and your resume. Choose a tool to get started.</p></div><label className="tool-search"><span className="sr-only">Find a tool</span><input type="search" placeholder="Find a tool... try image, résumé or PDF" value={search} onChange={e => setSearch(e.target.value)} /></label></div><div className="tool-tabs" role="group" aria-label="Tool categories">{['All tools', ...new Set(available.map(tool => toolCatalog[tool.slug].category))].map(group => <button key={group} className={category === group ? 'selected' : ''} aria-pressed={category === group} onClick={() => setCategory(group)}>{group}</button>)}</div><p className="tool-count" role="status">{filtered.length} {filtered.length === 1 ? 'tool' : 'tools'} available</p><div className="tool-grid">{filtered.map(tool => <ToolCard key={tool.slug} tool={tool} />)}</div>{filtered.length === 0 && <div className="empty-workspace"><h2>No tools found</h2><p>Try another search or category.</p><button onClick={() => { setSearch(''); setCategory('All tools'); }}>Show all tools</button></div>}<div className="tools-bottom"><span className="tool-icon">✦</span><div><h2>Your files. Your control.</h2><p>Image editing, OCR and résumé previews run in your browser. Account saves and media-link downloads are clearly marked when server processing is needed.</p></div></div></section>;
}
