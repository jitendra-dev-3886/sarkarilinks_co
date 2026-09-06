# Release notes — 6 September 2026

**Status:** updated local application; full SRS and production acceptance remain incomplete.

## Homepage visual refinement

The homepage now uses a dark introductory panel with navy/teal as the default, four direct task links, and compact resume/photo/OCR shortcuts. Job listings appear before the exam notice board. All five administrator theme choices retain their own dark accent combinations; notice content and forms stay on light surfaces.

## Delivered

- Simplified homepage: search, important notices, returning-user shortcuts and three application tools. Compact footer; the full directory remains in Sitemap.
- Five administrator-selectable designs, two reading sizes, improved title/tab/button contrast and mobile layouts.
- Member login, job preferences/bookmarks, private resume saves and browser image/OCR/AI tools.
- Private advertisement upload/extraction, editable category suggestions and independent publication review.
- Admissions and Certificate Verification added to the eight supported content sections and their permissions.
- Seven public information/help pages; administrator editing of page text, business details and support email.
- MySQL cutover: 24 tables verified in `sarkarilinks_co_live` on MySQL 8.0.45. SQLite backup retained; existing unrelated database left intact.

## Master-data status

Administrator can create/update **state, qualification, department and category** values through **Taxonomy**. Another staff role may receive `taxonomy.manage` with `cms.access`. Only Administrator currently has that grant, and **zero taxonomy values are populated**. No permission assignments or master records were changed when preparing these manuals.

Organization CRUD, dynamic menus, advertising/integration masters, bulk taxonomy import and taxonomy delete/archive remain unavailable. Roles, content sections, languages and tools use predefined sets with the supported configuration screens described in the [manual](admin-user-manual.md).

## Verification

- 50 backend tests / 341 assertions passed in isolated SQLite.
- 14 production-build browser workflows passed.
- Live MySQL staff login/access/logout and transaction-only search, publication, dates and Hindi JSON checks passed.
- Migration row comparisons, foreign keys and immutable-audit protections passed. Build and formatting checks passed.

These checks do not constitute a complete production security/accessibility audit or a full backend test-suite run against MySQL.

## Operator actions

1. Add the master values needed for your notices, then tag and publish accurate content.
2. Enter real business/support details and review policy drafts in **Site information**.
3. Keep MySQL, the queue worker and scheduler running; maintain protected backups.

Email verification/recovery, MFA, working alerts, complete account export/deletion and ad/payment integrations remain outstanding. Successful live downloads from every social platform and production Docker execution remain unverified. No revenue or search-ranking guarantees are made.

Start here: [simple workflow](quick-workflow.md) · [administrator manual](admin-user-manual.md) · [database backup and master audit](mysql-cutover-and-masters.md).


## Five homepage layouts

Appearance now offers five different structures: Ocean split portal, Forest jobs workspace, Studio search-first, Editorial bulletin and Focus quick list. Existing administrator preview, audited save and reading-size controls apply to every choice. Mobile layouts preserve the reading order, and saved jobs/recent tools remain available. See appearance.md for selection instructions and research references.


## Classic notice board option

Added a sixth homepage structure with compact category navigation and three-column published-notice lists. Administrators can preview/apply it with any existing color theme. Includes language selection, refresh, saved jobs and closing-soon filtering. The additive home_layout migration is applied to local MySQL.
