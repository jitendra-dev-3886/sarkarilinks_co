import { useQuery } from '@tanstack/react-query';
import { getJson } from '../../api/content';
import type { PortalTool } from '../tools/Tools';
import ClassicHome from './ClassicHome';
import { Faq } from '../../components/Feedback';

export default function Home() {
  const tools = useQuery({ queryKey: ['tools'], queryFn: ({ signal }) => getJson<{ data: PortalTool[] }>('/tools', signal) });
  return <div className="government-home"><ClassicHome tools={tools.data?.data ?? []} /><div className="home-information-grid"><section className="government-about"><h2>Government job notices, organized for you</h2><p>Find recruitment notifications, examination results, admit cards, answer keys, syllabus and admission notices. Open a notice to review eligibility, important dates and the official source before applying.</p><p>SarkariLinks is an independent information portal, not a government website. We do not collect government application fees.</p></section><Faq items={[{ question: 'How do I apply for a government job?', answer: 'Open the job notice, check the eligibility and closing date, then use the official source link for the issuing authority’s application instructions. Applications are not submitted through SarkariLinks.' }, { question: 'Where can I find results and admit cards?', answer: 'Choose Results or Admit cards from the menu or the notice columns. Each published notice links to its official source. Keep your registration details ready when visiting the issuing authority’s website.' }, { question: 'Can I save a job for later?', answer: 'Create a free account or sign in, then select Save job on a notice. Your shortlist is available from My saved jobs. You can browse notices without an account.' }]} /></div></div>;
}
