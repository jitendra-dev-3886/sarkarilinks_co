## Single portal layout - September 8, 2026

The active design is now one compact government notice board with a navy and blue palette and system typography. The homepage no longer loads alternate theme compositions. Superadmin manages reading size only; old preview URLs cannot change the layout. Public API and server-rendered metadata normalize legacy appearance records to the same design without read-side database writes. Updates retain role enforcement, optimistic concurrency and audit logging. Notice feeds, language selection, search, saved jobs and tools retain their existing business logic.

Validation: production frontend build; five appearance backend tests (33 assertions). Browser checks cover reading settings, real search, notice categories and viewport widths from 320 to 1440 pixels.

# Product audit and incremental enhancement — 8 September 2026

## Optional compact-card layout

Superadmin now has **Homepage appearance → Homepage structure → Compact cards**. It preserves the selected palette and reading size while using smaller category headers, tighter notice spacing, 8px card corners and content-sized panels. Mobile notice links keep 44px targets. Search, notices, dates, bookmarks, language switching and refresh reuse the existing notice-board logic.

The `compact-cards` layout is validated by the appearance API, persisted in the existing string column, exposed in public settings and server-rendered HTML, and supported by authorized previews. No schema migration or live setting change is required. Build and all six appearance backend tests passed. Preview/publish and responsive browser coverage are in `compact-cards.spec.ts`.

## Current behavior: superadmin-selected appearance is authoritative

The latest correction restores the saved appearance settings as the source of truth. The live appearance endpoint reported `theme=focus`, `home_layout=classic`, `text_size=standard`, version 72. Those live settings were read, not changed.

`Home` now chooses the original five-template `ThemeHome` composition for `theme`, the government notice board for `classic`, and its quick-start banner for `classic-quick`. The former unconditional Classic rendering has been removed. Superadmin preview still uses its authorized query parameters without changing visitor settings.

`features/appearance/theme.css` owns the original five palettes, heading fonts and shared color aliases. It loads after presentation styles. Fixed palette definitions were removed from the redesign and government styles; navigation, notices, tools, account panels, footer and controls use the selected palette. Form controls follow the configured root reading size again. The appearance editor descriptions and structure choices reflect their actual behavior.

Earlier notes below are historical iterations. In particular, the old statements that all layout values render the same government homepage no longer apply.

Validation for this correction: all four appearance browser tests passed against a production build in an isolated database. Coverage includes publishing all five themes, checking distinct layouts, palette values on public/tool/authentication pages, Classic and quick-start selection, preview isolation, guest restrictions, larger inputs, mobile reflow and recent-tool persistence. Live settings were re-read and remained Focus / Classic / Standard, version 72. Duplicate palette declarations were removed from `readability.css`; the authoritative values now reside only in the appearance stylesheet.

## Current direction: government-job portal

The latest user clarification supersedes the SaaS landing-page composition described below. The public homepage now uses a government notice-board layout: category-first navigation, search, latest highlights, organization links, three primary notice columns, additional admissions/answer-key/syllabus columns and supporting application tools. The default palette is maroon with a dark navigation bar, while saved alternative palettes remain available.

The existing `ClassicHome` queries and authenticated bookmarks were reused. Results, admit cards and latest jobs lead the desktop grid; latest jobs leads the stacked mobile view. Notice language, refresh, closing-soon ordering, private saved jobs and related tools retain real API behavior. Closing dates are shown when supplied by published notices. No external vacancies were copied or fabricated. The marketing hero/tool launcher is no longer rendered on the homepage. Brand and navigation now explicitly describe government jobs and exam updates.

This is an independent portal; original-source links and the non-government disclaimer remain visible. Historical implementation notes below describe earlier iterations, not the current homepage design.

## Follow-up: full visual redesign

The subsequent request for a full redesign replaces the earlier homepage presentation with `LaunchHero` and a new public shell. The light workspace identity uses indigo by default, a live searchable tool launcher, discovery navigation, opportunity search, compact content cards, a multi-column footer and a consistent inner-page treatment. Tool processing, authentication, account, listing, information and résumé screens share `redesign.css`; obsolete dark inner-page banner rules were removed from `readability.css`.

The redesigned homepage is now used for every saved homepage setting. Legacy `classic` and `classic-quick` values map to a compact opportunity list rather than rendering the former page. Brand palette and reading-size settings remain stored in the same backend contract; appearance help text explains the new behavior. Old browser tests asserting exact classic-page markup, old hero text or old navigation labels need migration to the redesigned presentation. The new product browser test covers the replacement homepage and navigation rather than those retired selectors.

No backend processing, role authorization, account ownership, billing or AI provider behavior was changed by this visual follow-up. The production build and responsive checks cover the new public journeys at 320, 390, 768, 1024 and 1440 pixels. Existing member persistence and actual image/PDF exports passed after the visual changes. Initial screenshot inspection prompted removal of old dark banners and correction of the footer navigation layout.

## Existing product and compatibility boundaries

SarkariLinks is an independent government opportunities portal with an application toolkit, not yet a subscription SaaS. React 19/TypeScript/Vite and React Query serve public listings, detail pages, site information, tools, member accounts and the staff CMS. Laravel 13 supplies versioned public APIs and same-origin cookie-session endpoints. MySQL is the local operational database; tests use isolated SQLite. No operational database migration was required for this enhancement.

Public content passes visibility, publication, expiry and source-verification rules. Staff roles and granular permissions protect author/reviewer publication workflows, taxonomy, user management, tools, appearance, site information and operations. Private originals, advertisement extraction and queued media downloads already exist. These contracts remain intact. Existing uncommitted admin/media changes and a quiz-removal migration were preserved.

Authentication uses CSRF-protected writes, HttpOnly sessions, session rotation, password hashing, throttled login and member-only registration. Bookmarks and résumé documents are scoped to the authenticated owner. Password changes exist; forgot/reset password and email verification do not. Those are release gaps, not completed features.

The browser toolkit provides image conversion/compression/resizing, portrait segmentation, English/Hindi OCR and PDF extraction, image-to-PDF, calculators and résumé printing. ONNX, OCR, PDF libraries and their workers are loaded on demand. Media downloads are server jobs with account gating and expiry. Only segmentation and OCR are labeled as model-based processing; no generative assistant or writing provider is configured.

## Changes in this increment

- Shared product tokens, control sizing, focus treatment, responsive workspace navigation, restrained cards and readable tool descriptions. Existing selectable homepage structures and brand palettes remain available.
- The theme homepage adds primary/secondary actions, actual enabled-tool cards, workflow, benefits/use cases, privacy/AI explanations, FAQ and a final conversion section. Classic notice-board layouts remain unchanged.
- Reusable loading skeleton and FAQ components. Tool API failures offer retry; related tools prioritize the current category.
- Image tools support real drag-and-drop with single-file, MIME and size validation, busy-state semantics and a distinct compression action. Existing processing/export logic remains in place.
- Workspace sidebar links to actual saved jobs, preferences, résumé editor and media history. Free-plan messaging makes no credit, billing or subscription claims. Logout failures are visible.
- Résumé documents accept optional projects, certifications and achievements while old saved documents still load. Font and spacing controls affect preview/print; these display settings are session-only. A local keyword comparison is explicitly not an ATS score or AI judgment.
- Staff route code loads separately; repeated member session reads use a short freshness window. Authorization remains enforced by the backend on every protected request.
- Public server responses retain crawlable content, canonical URLs, Open Graph and sitemap behavior, and add Twitter metadata and tool breadcrumbs. Client navigation refreshes social metadata and discards stale server breadcrumbs.

## Remaining production work

This increment is not completion of the entire requested SaaS transformation.

1. Build and test password recovery and verification using configured transactional email, expiring signed/tokenized links, enumeration-safe responses and resend throttling. Do not gate existing users until a migration policy is defined.
2. Add backend-managed plan definitions, entitlements and atomic usage accounting before exposing Pro/Business, credits or upgrade purchases. Billing requires a provider, webhook verification, idempotency and refund/cancellation policy.
3. Add owner-scoped tool favorites/history and explicit retention controls. Existing recently opened tools store names only on the device; they are not job completion analytics.
4. Extend the résumé document to ordered typed sections/custom sections and persisted display preferences. Current experience and education remain text fields; parsing fills contact details only. AI rewriting requires a real provider and consent/data-handling configuration.
5. Unify tool metadata/help/FAQ in backend-managed records so frontend and server SEO share one content source. Add matching FAQ schema only when server-rendered FAQ content exists. Current client FAQ does not claim rich-result eligibility.
6. Consolidate legacy CSS incrementally. This compatibility layer does not remove the existing multi-stylesheet cascade. Audit every theme, staff table/dialog and zoom setting before retiring old selectors.
7. Measure production Core Web Vitals and accessibility with representative content/devices. A successful build or overflow test is not a Lighthouse/performance certification. Large OCR/model assets remain an explicit first-use download cost.
8. Add testimonials only with genuine approved content; add AI assistant/notifications only with functioning backing services. No placeholder endorsements, invented counters or fake payment controls were added.

## Design conventions

`frontend/src/product.css` defines reusable surface, text, border, radius, shadow and spacing tokens. Use semantic links for navigation, buttons for actions, labels for inputs, `role=status` for progress and `role=alert` for actionable failures. New layouts use a 700px mobile boundary and 1000px intermediate boundary, flexible minmax grids and at least 44px primary controls. Respect existing reduced-motion and print styles. Display time-limited/server processing conditions beside the relevant action.

## Validation results

- Production TypeScript/Vite build passed. Staff console is emitted separately; the primary JS entry is approximately 360 KB / 110 KB gzip. This is a build measurement, not a Core Web Vitals result.
- Full Laravel suite: 51 tests / 353 assertions passed. After extending the private résumé persistence assertions, the member suite passed again: 8 tests / 94 assertions.
- Pint passed for modified PHP controllers and the member test. `git diff --check` passed.
- Initial browser suite: 15 passed, 2 timed out waiting for appearance-save/tool-list responses. Both failed paths passed unchanged against the production build in a fresh isolated test database.
- New production browser test passed for invalid drag/drop rejection, guest résumé sections, local keyword review, font controls, print visibility and no horizontal overflow at 1440, 1024, 768, 390 and 320 pixels. The targeted production rerun passed 3/3 tests.
- Existing browser coverage passed for member registration/login/logout, private résumé persistence, actual image/PDF exports, real OCR and portrait segmentation, all five themes, large reading size, staff publication/permissions, advertisement extraction and public navigation. A desktop homepage screenshot was visually inspected.
