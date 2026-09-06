# SRS delivery tracking

## Latest correction: working staff CMS and RBAC

The backend now has database-backed roles and granular grants, session login/logout with CSRF and rate limiting, a React staff console, draft create/edit/preview, author ownership policies, independent reviewer approval, scheduling/publication/archive transitions, user creation/role assignment, role permission editing and append-only audit history. A local PHP 8.4 runtime is installed; backend tests and real browser workflows have now been executed. See [staff console and verification](staff-console.md) for the current setup and acceptance walkthrough.

The historical initial-slice notes below describe the first delivery. Where they say that auth/CMS/backend execution are pending, those specific items are superseded by this correction. The broader SRS still has outstanding work, particularly MFA, public accounts, typed content forms, media/taxonomy, subscriptions, tools and production acceptance.

## Implemented in this increment

- Official Laravel 13 scaffold; separate React 19.2/TypeScript/Vite app, Router and TanStack Query.
- Responsive navy/blue public shell, six category routes, search, pagination, detail view, official attribution and API error/empty states.
- Versioned read API with validated filters, stable pagination order and explicitly serialized public fields.
- Shared locale-aware content table, taxonomy terms/pivot, soft deletion, status enum and visibility boundary.
- Keyword substring search, taxonomy API filters and newest/closing-soon sorting. Not full-text relevance search.
- Feature tests for draft/future/expired/unverified isolation, source metadata, invalid filters and deadline ordering.
- Separate multi-stage Docker builds, MySQL/Redis/worker/scheduler service topology, non-root application processes and private database ports.
- Initial build/test/dependency-audit CI and setup instructions.

## Verification limitations

Frontend build and lockfile checks can run on the supplied workstation. Backend runtime, database feature tests and Docker builds require the supported PHP/Docker environment. A CI file is not evidence that those checks have passed. Full browser, accessibility, load and recovery audits remain outstanding.

## Next milestones, in dependency order

1. Finish Phase 0: Sanctum cookie authentication, verification/recovery, privileged MFA, granular RBAC/policies, immutable audit storage, typed detail tables and taxonomy management.
2. CMS author/reviewer workflow: forms, preview, source validation, transitions, corrections, scheduled publication and cache invalidation. No public writes until authorization tests pass.
3. Public MVP completion: full filter UI, type-specific detail sections, related content, SEO rendering/crawl proof, metadata, canonical URLs, sitemap and managed policy pages.
4. Content expansion: notifications, redirects, link checks, attachment versioning and secure storage/scanning.
5. Accounts/alerts: idempotent bookmarks, saved searches, session revocation, deletion/export, double opt-in subscriptions and suppression-aware deliveries.
6. Tools: validated client calculators, followed by isolated queued conversions, safe input inspection, signed downloads and retention cleanup.
7. Release hardening: dev/test/production Compose overlays, immutable image promotion, static analysis, contract/E2E/a11y/load/security tests, JSON/correlation logs, monitoring, backup/restore drill and staging acceptance.

## Requirement status

| Requirement group | Status |
| --- | --- |
| FR-SRCH-001/002/004/006 | Partial: keyword and taxonomy API, URL search/sort/page; relevance, tags, full UI/date filters pending |
| FR-CNT-001/002 | Partial: listing/detail visibility and attribution; canonical SEO and audit history pending |
| FR-CNT-003–006 | Pending |
| FR-USR, FR-ADM, FR-TOL | Pending |
| NFR and production acceptance | Not yet demonstrated |

No milestone is accepted solely because a scaffold or test file exists. Completion requires passing execution evidence and the SRS acceptance criteria.
