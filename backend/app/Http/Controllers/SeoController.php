<?php

namespace App\Http\Controllers;

use App\Domain\Content\Content;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SeoController extends Controller
{
    private const CATEGORIES = ['jobs' => 'Government jobs', 'results' => 'Results', 'admit-cards' => 'Admit cards', 'answer-keys' => 'Answer keys', 'syllabus' => 'Syllabus', 'schemes' => 'Government schemes'];

    private function origin(): string
    {
        return rtrim(config('portal.url'), '/');
    }

    public function robots()
    {
        return response("User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nDisallow: /account\nDisallow: /login\nDisallow: /search\nSitemap: ".$this->origin()."/sitemap.xml\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemap(Request $request)
    {
        // Paginated sitemap index prevents silently dropping older public notices.
        $count = Content::publiclyVisible()->count();
        if (! $request->has('page')) {
            $xml = '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
            for ($page = 1; $page <= max(1, (int) ceil($count / 1000)); $page++) {
                $xml .= '<sitemap><loc>'.e($this->origin().'/sitemap.xml?page='.$page).'</loc></sitemap>';
            }

            return response($xml.'</sitemapindex>', 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
        }
        $input = $request->validate(['page' => ['required', 'integer', 'min:1', 'max:100000']]);
        $urls = [];
        if ((int) $input['page'] === 1) {
            $urls = ['/', '/tools', ...array_map(fn ($type) => '/'.$type, array_keys(self::CATEGORIES))];
            foreach (DB::table('portal_tools')->where('enabled', true)->pluck('slug') as $slug) {
                $urls[] = '/tools/'.rawurlencode($slug);
            }
        }
        foreach (Content::publiclyVisible()->orderBy('id')->offset(((int) $input['page'] - 1) * 1000)->limit(1000)->get(['type', 'slug', 'locale']) as $content) {
            $urls[] = '/'.$content->type.'/'.rawurlencode($content->slug).($content->locale === 'hi' ? '?locale=hi' : '');
        }
        $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach ($urls as $url) {
            $xml .= '<url><loc>'.e($this->origin().$url).'</loc></url>';
        }

        return response($xml.'</urlset>', 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    public function page(Request $request, ?string $path = null)
    {
        $path = trim($path ?? '', '/');
        $parts = explode('/', $path);
        $locale = $request->query('locale') === 'hi' ? 'hi' : 'en';
        $title = 'Government jobs, useful tools & your next opportunity';
        $description = 'Discover verified government job notices, save your shortlist and use free image, OCR and resume tools on SarkariLinks.';
        $body = '';
        $status = 200;
        $private = preg_match('~^(account|admin|login|search)(/|$)~', $path);
        if ($path === '' || isset(self::CATEGORIES[$path])) {
            $title = self::CATEGORIES[$path] ?? $title;
            $body = '<h1>'.e($title).'</h1><p>'.e($description).'</p>';
            $query = Content::publiclyVisible()->where('locale', $locale);
            if ($path !== '') {
                $query->where('type', $path);
            }
            foreach ($query->latest('published_at')->limit(15)->get() as $item) {
                $href = '/'.$item->type.'/'.rawurlencode($item->slug).($locale === 'hi' ? '?locale=hi' : '');
                $body .= '<article><h2><a href="'.e($href).'">'.e($item->title).'</a></h2><p>'.e($item->summary).'</p></article>';
            }
        } elseif ($path === 'tools' || ($parts[0] === 'tools' && count($parts) === 2)) {
            $tools = DB::table('portal_tools')->where('enabled', true)->when(isset($parts[1]), fn ($q) => $q->where('slug', $parts[1]))->get();
            if ($tools->isEmpty() && isset($parts[1])) {
                $status = 404;
            }
            $title = isset($parts[1]) ? ($tools->first()->name ?? 'Tool unavailable') : 'Free online tools, local AI & resume builder';
            $description = isset($parts[1]) ? ($tools->first()->help ?? 'This tool is not currently enabled.') : 'Convert and compress images, remove portrait backgrounds, extract text and build your resume with free online tools.';
            $body = '<h1>'.e($title).'</h1><p>'.e($description).'</p>';
            foreach ($tools as $tool) {
                $body .= '<article><h2><a href="/tools/'.e(rawurlencode($tool->slug)).'">'.e($tool->name).'</a></h2><p>'.e($tool->help).'</p></article>';
            }
        } elseif (count($parts) === 2 && isset(self::CATEGORIES[$parts[0]])) {
            $item = Content::publiclyVisible()->where('type', $parts[0])->where('slug', $parts[1])->where('locale', $locale)->first();
            if ($item) {
                $title = $item->title;
                $description = $item->summary;
                $body = '<article><h1>'.e($title).'</h1><p>'.e($description).'</p><p>'.e($item->organization).'</p>';
                foreach ($item->details ?? [] as $key => $value) {
                    if ($value) {
                        $body .= '<h2>'.e(ucwords(str_replace('_', ' ', $key))).'</h2><p>'.nl2br(e($value)).'</p>';
                    }
                }
                $body .= '<p>'.nl2br(e($item->body)).'</p><a href="'.e($item->source_url).'" rel="noopener noreferrer">View official source</a></article>';
            } else {
                $status = 404;
            }
        } elseif ($private) {
            $title = 'Your workspace';
            $body = '<h1>Your workspace</h1><p>Sign in to your private account.</p>';
        } else {
            $status = 404;
        }
        if ($status === 404) {
            $title = 'Page not found';
            $description = 'This page is unavailable.';
            $body = '<h1>Page not found</h1><a href="/">Return home</a>';
        }
        $canonical = $this->origin().'/'.$path.($locale === 'hi' ? '?locale=hi' : '');
        $template = config('portal.shell');
        $html = is_file($template) ? file_get_contents($template) : '<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>SarkariLinks</title><meta name="description" content=""></head><body><div id="root"></div></body></html>';
        $html = preg_replace_callback('~<title>.*?</title>~s', fn () => '<title>'.e($title).' | SarkariLinks</title>', $html);
        $html = preg_replace_callback('~<meta name="description"[^>]*>~', fn () => '<meta name="description" content="'.e(mb_substr($description, 0, 250)).'">', $html);
        $appearance = AppearanceController::current();
        $html = str_replace('<html lang="en">', '<html lang="'.$locale.'" data-theme="'.e($appearance['theme']).'" data-text-size="'.e($appearance['text_size']).'">', $html);
        $head = '<link rel="canonical" href="'.e($canonical).'"><meta name="robots" content="'.($private || $status === 404 ? 'noindex,follow' : 'index,follow').'"><meta property="og:title" content="'.e($title).'"><meta property="og:description" content="'.e(mb_substr($description, 0, 250)).'"><meta property="og:url" content="'.e($canonical).'"><meta property="og:type" content="website">';
        $nav = '<header><a href="/">SarkariLinks</a><nav aria-label="Main navigation">';
        foreach (self::CATEGORIES as $slug => $label) {
            $nav .= '<a href="/'.$slug.'">'.e($label).'</a> ';
        }
        $nav .= '<a href="/tools">Tools &amp; AI</a></nav></header>';
        $html = str_replace('</head>', $head.'</head>', $html);
        $html = str_replace('<div id="root"></div>', '<div id="root">'.$nav.'<main>'.$body.'</main></div>', $html);

        return response($html, $status, ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'no-cache']);
    }
}
