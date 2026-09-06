# Categories, public pages and administrator editing

Admissions (`/admissions`) and Certificate Verification (`/certificate-verification`) use the existing draft, independent review and publication workflow. Advertisement extraction can suggest either category; ambiguous notices still require manual selection. Certificate Verification is an information category, not a service that authenticates documents or collects certificate numbers.

The footer links to About Us, Privacy Policy, Terms of Use, Disclaimer, Contact Us, FAQ and the human-readable Sitemap (`/sitemap`). `/sitemap.xml` remains the search-engine sitemap. UPSC, SSC, IBPS, Railway RRB, UPSSSC and BPSC shortcuts open internal searches; results depend on published content and are not official organization feeds.

## Edit without changing code

1. Sign in with the administrator role and open **Admin → Site information**, or `/admin?tab=site-information`.
2. Enter the real public operator/business name, support email and optional address. These are shown on the relevant public pages. A valid email enables the **Email support** link; there is no message-submission form or email delivery worker in this feature.
3. Select **Page to edit**. Change its title, search description and sections. Add or remove sections as needed.
4. Click **Save site information**. All edited pages and public details are stored together in the database. Reloading retrieves the saved state. A conflicting newer edit returns 409 instead of silently overwriting it.
5. Use **Open published page** to inspect the saved version. Unsaved changes do not appear in that link.

The draft policy text describes current application behavior. Review and adapt it to the actual operator, hosting, retention, support and commercial arrangements before clearing **Mark as draft awaiting operator review**. Policies require a business name and valid support email before their draft flag can be cleared; this validation does not establish legal compliance. Draft pages remain readable with a draft label, are marked noindex, and are omitted from the XML sitemap. This is not a private editorial draft workflow for these information pages.

Only the administrator role plus `settings.manage` can edit site information. Saved changes are audited. Text is escaped in initial server HTML and React; HTML, JavaScript and tracking snippets are not executed from the editor. Policy review should account for the [official Indian data-protection framework](https://www.meity.gov.in/documents/act-and-policies), where applicable; this implementation does not certify compliance.

## Deployment and permissions

Migrations `000005` and `000006` are applied locally. Run the project's PHP 8.4 `artisan migrate --force` before serving this release elsewhere. The new category migration extends standard editorial roles only within their existing job-action permissions; it does not grant reviewer powers to authors or staff access to public accounts. New installations receive the same baseline grants through the access-control seeder. Custom roles can be assigned the new category grants through the existing permission matrix.

`backend/resources/site-pages.json` provides initial page text for new databases. Once migrated, administrator-saved database content is authoritative; editing that seed JSON does not overwrite existing pages.

Public API: `GET /api/v1/pages/{slug}`. Private administrator API: `GET/PUT /api/v1/admin/site-information`; PUT requires `{version, document: {owner, support_email, address, pages}}` and the normal session/CSRF controls. Page slugs are fixed; titles and contents are editable. Public details are intentionally public, so do not enter private addresses or personal credentials.

## Executed checks

50 backend tests (341 assertions), 14 production-build browser workflows, PHP formatting and the frontend build passed. New checks cover category draft permissions, information-page authorization and escaping, stale edits, policy indexing, admin persistence, contact links, organization searches and mobile layouts. Extraction classifier checks also passed for both new categories and ambiguous notices.
