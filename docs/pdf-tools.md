# Local PDF tools

Routes: `/tools/pdf-compressor` and `/tools/pdf-merge-split`.

Both tools use the existing pdf-lib and PDF.js dependencies. The workspace and processing module are loaded on demand. Files are read in the browser; no upload or account endpoint is called. Admin tool settings and server SEO/sitemap discovery use the two new portal_tools rows.

## Behavior

- Optimize rewrites the PDF structure using compressed object streams. It retains the original file if output is not smaller.
- Scanned PDF compression is opt-in: pages are rendered at up to 108 dpi with a 3 megapixel cap, then rebuilt as JPEG-backed PDF pages. This removes selectable text, links, bookmarks and accessibility information. Consent and limitations are visible before processing.
- Merge supports file order changes by dragging or explicit Up/Down controls.
- Extract accepts comma-separated pages and inclusive ranges, preserving their requested order and removing duplicates. It exports selected pages together in one PDF, not a ZIP of separate pages.
- The first output page is previewed. Downloads remain available if preview rendering fails.
- Input changes invalidate old results. Damaged/password-protected files, interactive form/signature fields and invalid page ranges report errors. Plain unsigned PDFs are required.

Limits: 10 MB per file; 10 files and 30 MB combined for merging; 50 pages per input and per output. PDF merge/extract preserves page content, but does not promise document-level bookmarks or attachments.

## Installation

The local database migration has been applied. Other installations must run `php artisan migrate` as part of deployment. Existing admin tool management can rename, disable or edit help for these tools.

## Validation

Browser tests inspect actual downloaded PDFs for page count/order, optimization size, scanned compression savings and corrupted-file rejection. A file-upload request check verifies the merge/extract workflow stays local. Route checks cover 320/768/1440 pixel widths. Backend tests cover discovery, disabled tools, server-rendered pages and the paginated sitemap.
