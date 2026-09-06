# Advertisement import and review

Staff can upload a PDF, JPG or PNG, extract English/Hindi text locally, review suggested fields, and create a draft in Jobs, Results, Admit Cards, Answer Keys, Syllabus or Schemes. Published content is fetched through the category API and displayed in structured sections.

## Use on this workstation

Dependencies and migrations are installed. Restart `npm run dev` if it was already running: the launcher now starts the extraction queue worker, Laravel, scheduler and Vite.

1. Sign in at `/admin` as an author or administrator. Choose **Advertisement imports**.
2. Select the file, enter the official source URL, and choose **Upload & extract**.
3. The original is saved privately. Extraction progress updates automatically; you can return through Import history.
4. Compare the original with the text and suggestions. Correct the section, title, organization, summary, dates, vacancies, fees and other fields. Unrecognized fields stay empty; ambiguous categories require a manual choice.
5. Expand **Search filters & classification** to tag the notice. Administrators configure these options in **Taxonomy**.
6. Confirm your review and create the draft. Submit it from **Content**. An independent reviewer can download the uploaded original, approve and publish it.
7. The published notice appears in the selected section; Hindi records use `?locale=hi`. Drafts and unverified/expired records remain private.

Original uploads, text and suggestions are durable. A duplicate upload by the same user opens the existing import. Each import can create one draft. Corrections are saved in the content record while the extraction remains available as evidence.

## Limits and guarantees

- Inputs: maximum 10 MB, 50 PDF pages, 20 megapixels for JPG/PNG. Extracted text: maximum 100,000 characters.
- MIME, extension and signature checks run before processing. PDF endings allow trailing whitespace. PDF parsing rejects actual document/page/form scripts and embedded attachments; ordinary text, compressed image bytes, image metadata and empty PDF attachment lists are not rejected just for containing script-like keywords. This does not replace production malware scanning or guarantee complete polyglot detection.
- Random private storage paths; downloads require ownership/media management or authorization to view the linked content.
- Laravel queues a separate Node process with a 512 MB JavaScript heap and 240-second process timeout. Worker timeout: 270 seconds; queue visibility: 300 seconds. Docker bounds worker resources to 1 GB and 2 CPUs. These are resource limits, not a complete hostile-file isolation boundary.
- PDF.js reads text PDFs and renders scanned/mixed pages; Tesseract.js recognizes English/Hindi with locally installed language files. No uploaded documents or extracted text are sent to external services. No runtime model download is required. See [PDF.js examples](https://mozilla.github.io/pdf.js/examples/) and [Tesseract.js local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md).
- Category and field suggestions use conservative keyword/line rules. Tables, unusual layouts, dates written in words and unclear scans may require substantial correction. Suggestions are never automatically verified or published.
- Low OCR confidence is shown as a warning. Failed imports offer Retry. The scheduled `advertisements:recover-stalled` command marks interrupted processing retryable after six minutes; queued imports remain queued when workers are offline.
- Rejections explain the cause: damaged PDF, interactive scripts, embedded attachments, password protection, page/size limits or unreadable text. For PDFs with scripts or attachments, print/export the advertisement pages to a new plain PDF. Internal runtime errors still use a generic message without exposing server paths.
- Editorial source files remain private and retained for provenance. A production retention policy, malware scanner and stronger worker isolation remain release work.

## Fresh installation and deployment

Run `npm ci` in the repository root for the extraction dependencies, in addition to frontend and Composer installation. Tested runtimes: Node 24 and PHP 8.4. From `backend`, run `php artisan migrate` and `php artisan db:seed --class=AccessControlSeeder`.

The additive media migration grants upload to existing author/administrator roles and media management to administrators; other customized grants are preserved. The seeder supplies defaults on new installations.

`npm run dev` starts the local services. For separately managed processes, run `php artisan queue:work --sleep=1 --tries=1 --timeout=270` and `php artisan schedule:work` from `backend`. A standalone PHP server needs upload_max_filesize=10M and post_max_size=12M; the dev launcher sets these.

`ADVERTISEMENT_NODE` can specify an absolute Node executable; `ADVERTISEMENT_SCRIPT` can override the extractor path. Defaults match the repository layout. Docker includes Node and pinned extraction packages and shares a private upload volume among web/worker/scheduler services. Docker execution has not been verified here.

## API contract

Prefix: `/api/v1`. Staff routes require authenticated same-origin cookies and `cms.access`; writes require CSRF. Errors use Laravel `message` and optional `errors`: 401 unauthenticated, 403 forbidden, 409 invalid state, 422 validation and 429 throttled.

| Method / path | Permission and behavior |
| --- | --- |
| GET `/admin/advertisements?page=1` | `media.upload`: own history; `media.manage`: all. Fifteen entries/page; list omits extracted text. |
| POST `/admin/advertisements` | `media.upload`; multipart `file`, `source_url`; 202 new, 200 duplicate; six/minute. |
| GET `/admin/advertisements/{id}` | Owner with upload permission or media manager; `{data: import}` with text, suggestions, extraction metadata, status/error. Hides paths/hashes. |
| GET `/admin/advertisements/{id}/download` | Same access; attachment, nosniff, restrictive CSP. |
| POST `/admin/advertisements/{id}/retry` | Same access; failed state only, 202; six/minute. |
| POST `/admin/advertisements/{id}/draft` | Same access plus selected `{type}.create`; validated CMS content fields, `details`, optional `term_ids`; 201 `{data: content}`. Ready unconverted imports only. |
| GET `/admin/content/{id}/advertisement` | Content view policy; download attached import, or 404. |
| GET `/terms?locale=en` | Public `{data: [{id,taxonomy,slug,label,locale}]}`. |
| POST `/admin/terms` | `taxonomy.manage`; `taxonomy`, `locale`, `slug`, `label`; audited label upsert by taxonomy/locale/slug. |
| GET `/tools` | Public enabled calculators: `{data: [{slug,name,help}]}`. |
| GET `/admin/tools` | `tools.manage`; includes disabled tools/settings. |
| PUT `/admin/tools/{slug}` | `tools.manage`; `name`, `help`, boolean `enabled`; audited. |
| GET `/admin/operations` | `operations.view`; import status, failed-job and scheduled-content counts, checked timestamp. No private files, job payloads or accounts. |

CMS saves accept optional `details` with string keys: `vacancies` (2,000 characters), `fees` (5,000), `eligibility`, `important_dates`, `application_process`, `benefits`, `exam_details` (10,000 each). Unknown keys are rejected. `term_ids` contains up to 30 distinct existing term IDs matching the content language. Omitting details/term IDs on update preserves them; explicit empty values clear them. Public detail API includes `details`; listing API omits it.

## Verification

`npm run test:extraction` exercises synthetic text/scanned PDFs, PNG and Hindi image fixtures with real engines, plus ambiguous categories and invalid dates. Hindi rendering needs a Devanagari font: Nirmala UI on Windows or Noto Sans Devanagari on Linux.

`npm run test:browser` generates fixtures, then runs Chrome workflows on an isolated SQLite database and real queue worker. Backend feature tests cover private uploads, rejection, ownership, category permissions, retries/recovery and independent publishing. Synthetic records are not inserted into the working portal database.

The reported `rajsthan.pdf` was tested directly: 6,570,724 bytes, 23 scanned pages, no detected scripts or attachments. All pages completed OCR in 199 seconds with 48,758 characters and a Jobs suggestion. Pages 4–8 received low-confidence warnings. The original raw-byte check matched `<?=` inside the scanned file; parsed validation avoids this false positive. Its previous 20-page rejection was resolved by increasing the PDF limit to 50. Extraction text remains unverified and needs editorial review.
