# Member workspace and modern tools

The public portal now uses a blue/teal design, an original SVG logo, responsive navigation, a searchable tool directory, job bookmarks and a personal dashboard. Recommendations use selected state, qualification, department and language; they are transparent filters, not a generative AI ranking. Notices still require source verification and independent editorial publication.

See the [homepage appearance guide](appearance.md) for five designs, administrator preview/publishing, reading sizes and returning-visitor shortcuts.

## Run on this computer

The additive migration, browser assets, portrait model and media Python environment are installed locally.

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:5173. If this address is already working, use that running instance rather than starting another copy. The launcher starts Laravel on port 8000, Vite on 5173, the queue worker and the scheduler. Keep its terminal open; Ctrl+C stops the services it started.

- `/account/login`: create a free member account or sign in. Registration grants only `user`, never staff permissions.
- `/account`: preferred jobs, saved notices, profile/preferences and password changes.
- `/tools`: search and filter all ten enabled tools.
- `/tools/resume-builder`: three templates, OCR import, editable preview, private account save/load/delete and browser Print / save PDF.
- `/login` and `/admin`: existing staff workspace. Local staff credentials remain in the private local-accounts JSON file.

The live local database currently has no published jobs. Job listings correctly show an empty state until reviewed jobs are published. Existing results and admit-card notices remain available. Synthetic test notices exist only in isolated test databases.

## Fresh installation

With Node 24, Python 3.11+ and the project's PHP 8.4 runtime:

```powershell
npm.cmd ci
npm.cmd ci --prefix frontend
npm.cmd run setup:tools
npm.cmd run setup:media
cd backend
../.cache/php84/php.exe artisan migrate
../.cache/php84/php.exe artisan db:seed --class=AccessControlSeeder
cd ..
npm.cmd run dev
```

For a fresh checkout without `.cache/php84`, install PHP 8.4 and Composer as described in README and use `php artisan ...`. `PORTAL_PHP` can point the launcher to that runtime. Media setup creates a project-local Python virtual environment and copies FFmpeg into `.cache/tools-bin`. `PORTAL_PYTHON` can select the Python used for installation. No AI API key is needed. Initial setup downloads open-source dependencies/model data; processing uses local assets afterwards.

## Tool behavior and limits

| Tool | Processing | Limits / behavior |
| --- | --- | --- |
| Image converter | Browser canvas | JPG, PNG, WebP; 10 MB / 20 MP; optional width and quality; aspect ratio preserved; white background for JPG |
| Image compressor | Browser canvas | Actual before/after sizes; reduce quality/width; lossless PNG can be larger |
| AI background remover | Browser ONNX/MODNet | Portraits of people; transparent PNG; first use loads a 24.7 MB model plus WASM; edge quality varies |
| Image & PDF to text | Browser PDF.js + Tesseract | English/Hindi; 10 MB / 10 PDF pages / 20 MP; native PDF text or scanned-page OCR; review output |
| Image to PDF | Browser pdf-lib | One image fitted onto an A4 page |
| CV / résumé builder | Browser, optional private DB save | Modern/classic/minimal; OCR fills empty contact fields only after review; other sections remain explicitly editable; Print / save PDF supports system fonts |
| Video & audio downloader | Private queued server worker | Public permitted YouTube/Instagram/Facebook links; video up to 720p or MP3; 10 minutes / 50 MB; two active jobs per account; source availability varies |
| Age / percentage / EMI | Browser arithmetic | Age uses the notice cut-off date; EMI is an estimate excluding fees |

Image/PDF source files and OCR text are not sent to our server by the browser tools. Résumé fields are uploaded only when **Save to my account** is chosen. Guest edits disappear on reload; there is no hidden localStorage résumé copy. Account saves are authenticated and owner-scoped. Avoid closing the editor before exporting or explicitly saving.

Media links are processed on the server. The worker allows only named platform hosts, rejects private/reserved IP addresses at DNS and socket connection time, does not use cookies or credentials, and rejects live, DRM, playlist and over-limit content. Outputs require the owning session and expire one hour after submission. `media:cleanup` runs every minute to remove expired files and recover jobs stalled for ten minutes. Files may remain on disk until the scheduler runs, but the download endpoint rejects expired files immediately. This is bounded processing, not a substitute for production container isolation or resource monitoring.

The live YouTube sample check returned **video unavailable**. Offline checks verify URL/network restrictions and actual FFmpeg MP3 conversion; successful downloads from each platform are not yet established on this network. Private, login-only or restricted sources are not bypassed. The UI reports failures rather than presenting fabricated download links.

## SEO and deployment

Each public tool has a readable route, title, description and usage instructions. Laravel supplies initial HTML for public listings, tool pages and published notice details; React replaces it with the interactive interface. Canonical and Open Graph tags, real 404 statuses, `robots.txt` and a paginated sitemap index are included. The sitemap excludes drafts, unverified, scheduled, deleted and expired notices. Private account/staff pages are noindex.

Set `PORTAL_PUBLIC_URL` to the public frontend origin (local: `http://127.0.0.1:5173`; production: your HTTPS domain), or let it fall back to `APP_URL`. Set this correctly before submitting `/sitemap.xml` in Search Console. Do not serve only a bare Vite index for production routes: the Nginx configuration forwards page requests to Laravel. `PORTAL_HTML_SHELL` selects the built HTML shell; Docker sets this automatically.

```powershell
npm.cmd run build
npm.cmd run preview
```

The local built preview opens on http://127.0.0.1:5176 and requires Laravel on port 8000. It uses the production CSP and initial HTML for testing. Docker now builds the frontend, local OCR/model assets and media worker from shared stages. Docker execution remains unverified because Docker is unavailable on this workstation.

No search-volume measurements or competitor benchmark were supplied. These changes improve discoverability and usability; they do not promise rankings or superiority over a named competitor. Email verification, forgotten-password recovery, alerts, MFA, account export/deletion and full SRS production acceptance remain outstanding.

## Verification

```powershell
npm.cmd run build
npm.cmd run test:browser
node scripts/test-browser.mjs --built
.cache/tools-python/Scripts/python.exe scripts/test-media.py
cd backend
../.cache/php84/php.exe artisan test
../.cache/php84/php.exe vendor/bin/pint --test
```

The browser suite exercises registration/login, server-side CMS denial for members, job saves, preferences, résumé persistence/print/mobile layout, real image/WebP/PDF output, OCR and local portrait inference, plus the existing staff and advertisement workflows. It uses isolated SQLite databases and synthetic files. Portrait inference smoke testing validates model execution and transparency, not portrait quality across diverse photos.

Executed locally: **46 backend tests / 289 assertions**, **12 production-build browser workflows with CSP**, and **three offline media checks** passed. The frontend build and Pint checks passed. CI definitions now include browser-asset setup and the built browser workflow; the remote CI run has not been executed here.

Implementation references: [MODNet model and Apache-2.0 license](https://huggingface.co/Xenova/modnet), [model preprocessing](https://huggingface.co/Xenova/modnet/blob/main/preprocessor_config.json), [yt-dlp documentation and platform limitations](https://github.com/yt-dlp/yt-dlp), and [Google's JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics). The model download is checked against a pinned SHA-256. Review model/runtime licenses when redistributing the build.

## Member API

All routes below are under `/api/v1`. Use the existing session cookie and `X-CSRF-TOKEN` from `/session/csrf` on mutations. Responses are private/non-cacheable. Validation failures use Laravel's `message`/`errors` JSON.

| Method and route | Body / result |
| --- | --- |
| `POST /register` | `name`, lowercase `email`, `password`, `password_confirmation`; 12+ chars, mixed case and numbers; signs in; 201; five attempts/minute |
| `GET /account/profile` | Own name/email/preferences/bookmark IDs |
| `PUT /account/profile` | `name`, `preferences: {locale, state?, qualification?, department?}`; taxonomy slugs must exist for selected language |
| `PUT /account/password` | `current_password`, `password`, `password_confirmation`; rotates current session |
| `GET /account/recommendations` | Paginated public jobs filtered by saved preferences |
| `GET /account/bookmarks` | Paginated currently visible saved notices |
| `PUT /account/bookmarks/{id}` | Save a visible notice; idempotent; 204 |
| `DELETE /account/bookmarks/{id}` | Remove own bookmark; 204 |
| `GET/PUT/DELETE /account/resume` | Own document; PUT wraps `document` with template, name, headline, email, phone, location, summary, experience, education, skills |
| `GET /account/downloads` | Own unexpired jobs and status, with no storage paths |
| `POST /account/downloads` | `url`, `format: video|audio`, `permission: true`; 202 UUID; 422 unsupported input, 429 limits, 503 missing worker |
| `GET /account/downloads/{uuid}/file` | Owning session only; ready/unexpired attachment or 404 |
