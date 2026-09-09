import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { categories, getJson, type Content } from '../api/content';
import { informationLinks, type InformationPage } from '../features/pages/SitePages';
import { toolCatalog } from '../features/tools/catalog';
export default function Seo() {
  const location = useLocation();
  const [type, slug] = location.pathname.split('/').slice(1), locale = new URLSearchParams(location.search).get('locale') === 'hi' ? 'hi' : 'en';
  const informationSlug = informationLinks.find(([path]) => location.pathname === `/${path}`)?.[0];
  const information = useQuery({ queryKey: ['site-page', informationSlug], queryFn: () => getJson<{ data: InformationPage }>(`/pages/${informationSlug}`), enabled: !!informationSlug });
  const detail = useQuery({ queryKey: ['detail', type, slug, locale], queryFn: () => getJson<{ data: Content }>(`/content/${encodeURIComponent(type)}/${encodeURIComponent(slug)}?locale=${locale}`), enabled: !!slug && categories.some(item => item[0] === type) });
  useEffect(() => {
    const slug = location.pathname.split('/')[2], tool = location.pathname.startsWith('/tools/') ? toolCatalog[slug] : null;
    const label = tool ? slug.replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase()) : location.pathname === '/tools' ? 'Free online tools, local AI & résumé builder' : categories.find(item => location.pathname === `/${item[0]}`)?.[1] || (location.pathname.startsWith('/account') ? 'Your personal workspace' : 'Government jobs, useful tools & your next opportunity');
    document.title = `${information.data?.data.title || informationLinks.find(([path]) => location.pathname === `/${path}`)?.[1] || detail.data?.data.title || label} | SarkariLinks`;
    const description = document.querySelector('meta[name="description"]'); description?.setAttribute('content', information.data?.data.description || detail.data?.data.summary || tool?.description || 'Discover verified government job notices, save your shortlist and use free image, OCR and résumé tools on SarkariLinks.');
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]'); if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = `${window.location.origin}${location.pathname}${new URLSearchParams(location.search).get('locale') === 'hi' ? '?locale=hi' : ''}`;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]'); if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
    robots.content = information.data?.data.review_required || information.error || detail.error || /^\/(account|admin|login|search)(\/|$)/.test(location.pathname) ? 'noindex,follow' : 'index,follow';
    for (const [key, value] of Object.entries({ 'og:title': document.title, 'og:description': description?.getAttribute('content') ?? '', 'og:url': canonical.href, 'og:type': 'website', 'twitter:card': 'summary', 'twitter:title': document.title, 'twitter:description': description?.getAttribute('content') ?? '' })) {
      const attribute = key.startsWith('og:') ? 'property' : 'name';
      let meta = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!meta) { meta = document.createElement('meta'); meta.setAttribute(attribute, key); document.head.append(meta); }
      meta.content = value;
    }
    // Server breadcrumbs describe the initial URL; discard them after client navigation.
    document.querySelectorAll('script[data-route-schema]').forEach(node => node.remove());
    document.documentElement.lang = new URLSearchParams(location.search).get('locale') === 'hi' ? 'hi' : 'en';
  }, [location.pathname, location.search, detail.data, detail.error, information.data, information.error]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);
  return null;
}
