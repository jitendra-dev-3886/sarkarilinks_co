# Initial architecture decisions

## Staff implementation update

The first-party browser console uses Laravel's built-in web session middleware on versioned `/api/v1/session` and `/api/v1/admin` routes, reached through the same-origin proxy. HttpOnly session cookies, CSRF verification and policy authorization are active. There are no personal access tokens in browser storage. Sanctum remains a future option for mobile/token consumers; it is not required by this session-only API boundary. PHP 8.4.25 is now installed locally in the ignored cache and the role/workflow tests have been executed. The read-only restriction in the initial decisions below is superseded for authenticated, policy-checked staff endpoints.

1. **Modular monolith:** Laravel Domain/Application/HTTP boundaries; no speculative repository layer. Public reads use explicit resources, never serialize an entire model.
2. **Runtime:** React 19.2 and Laravel 13 follow the SRS. PHP 8.4 is chosen for the container and test toolchain. Composer's platform setting targets 8.4 for resolution; it does not make XAMPP PHP 8.2 compatible.
3. **Content ingestion:** manual editorial publishing first. No scraping and no fictional production notices. The first slice intentionally has no unauthenticated write endpoints.
4. **Localization:** English default, locale stored with unique type/slug/locale. Hindi editing and translated routes remain pending.
5. **Search:** literal substring search is a temporary baseline, not the final performance/relevance solution. Replace behind `SearchContent` with MySQL full-text after realistic data and query tests.
6. **SEO:** CSR is suitable for the initial development slice only. Select and prove prerender/SSR for indexable public routes before public launch; do not claim SEO acceptance from SPA metadata alone.
7. **Dates:** UTC timestamps; India display timezone; government deadline dates stored separately with declared timezone.
8. **Hosting:** local Compose first; production topology/provider still undecided. The current Compose file is local-only, binds loopback, and is not a production deployment recipe.
9. **Accounts/tools:** email-first accounts and client-side calculators are suggested next defaults, subject to owner priorities; neither is implemented yet.

Baseline references: [Laravel 13 releases](https://laravel.com/docs/13.x/releases), [React versions](https://react.dev/versions), [Vite setup](https://vite.dev/guide/).
