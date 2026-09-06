import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categories, getJson, type Content } from '../api/content';
import { toolCatalog } from '../features/tools/catalog';
export default function Seo() {
  const location = useLocation();
  const [type, slug] = location.pathname.split('/').slice(1), locale = new URLSearchParams(location.search).get('locale') === 'hi' ? 'hi' : 'en';
  const detail = useQuery({ queryKey: ['detail', type, slug, locale], queryFn: () => getJson<{ data: Content }>(`/content/${encodeURIComponent(type)}/${encodeURIComponent(slug)}?locale=${locale}`), enabled: !!slug && categories.some(item => item[0] === type) });
  useEffect(() => {
    const slug = location.pathname.split('/')[2], tool = location.pathname.startsWith('/tools/') ? toolCatalog[slug] : null;
    const label = tool ? slug.replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase()) : location.pathname === '/tools' ? 'Free online tools, local AI & résumé builder' : categories.find(item => location.pathname === `/${item[0]}`)?.[1] || (location.pathname.startsWith('/account') ? 'Your personal workspace' : 'Government jobs, useful tools & your next opportunity');
    document.title = `${detail.data?.data.title || label} | SarkariLinks`;
    const description = document.querySelector('meta[name="description"]'); description?.setAttribute('content', detail.data?.data.summary || tool?.description || 'Discover verified government job notices, save your shortlist and use free image, OCR and résumé tools on SarkariLinks.');
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]'); if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = `${window.location.origin}${location.pathname}${new URLSearchParams(location.search).get('locale') === 'hi' ? '?locale=hi' : ''}`;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]'); if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
    robots.content = detail.error || /^\/(account|admin|login|search)(\/|$)/.test(location.pathname) ? 'noindex,follow' : 'index,follow';
    document.documentElement.lang = new URLSearchParams(location.search).get('locale') === 'hi' ? 'hi' : 'en';
  }, [location.pathname, location.search, detail.data, detail.error]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  return null;
}
