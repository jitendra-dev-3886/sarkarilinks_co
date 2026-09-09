# Page audit - September 9, 2026

## Coverage

The automated browser audit visits 35 public URLs, including the homepage, search and empty search, all eight notice categories, all seven information pages, the tool directory and all ten tool pages, both login screens, a published notice, and missing notice/page/tool states. It checks visible page content, browser runtime exceptions and horizontal overflow at 1440, 768 and 320 pixels.

A separate authenticated audit opens all ten administrator panels and the three account views (overview, saved jobs and preferences) at the same widths. Existing workflow tests exercise registration, sign-in/out, saved jobs, resume persistence, image/PDF downloads, OCR, portrait processing, validation, notice refresh, language selection, search, publishing, permissions, advertisement import and public information editing.

## Findings

The route and authenticated layout checks passed. No application layout fix was required by these checks. Three older test files still targeted retired homepage headings, navigation or notice-board structure; their selectors now match the current single card layout. The new administrator audit initially assumed every panel had an h2; the content panel starts with a table, so its readiness check now supports that structure.

Backend suite: 51 tests passed, with 351 assertions. A closing-soon feed assertion hit its five-second wait while the successful response took approximately 4.99 seconds; its asynchronous wait is now 15 seconds. An obsolete appearance mock was removed from that test.

## Limits

These checks use an isolated seeded database and Chrome. They cover every implemented route family and tool screen, not every production notice or possible content length. They do not constitute a manual screen-reader audit, cross-browser certification, or verification that third-party government links and media providers are currently available. Media processing requires a permitted real external source and was not tested end-to-end in this audit. Password recovery and email verification have no frontend routes in the current application and are not claimed as tested pages.
