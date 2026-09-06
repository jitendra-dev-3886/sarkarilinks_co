# Staff console and access control

## Test this workstation

The local PHP 8.4.25 runtime is installed at `.cache/php84/php.exe`, verified against the official release SHA-256. XAMPP PHP was not modified. The local SQLite database has been migrated and the access-control roles seeded.

From the project root:

```powershell
npm run dev
```

Open **http://127.0.0.1:5173/admin**. Keep the terminal open. This starts Laravel on port 8000, Vite on 5173 and the publishing scheduler. Do not use the XAMPP source-directory URL: the repository root contains private configuration and is denied by `.htaccess`.

Local administrator, author and reviewer accounts have been created. Read their generated passwords from `backend/storage/app/private/local-accounts.json` on this workstation. This file is ignored by Git and excluded from Docker images. These are development accounts only. No notices were invented or published to the working database.

For another installation, install PHP 8.4 and set `PORTAL_PHP` to its executable path if needed. Install dependencies, create the backend `.env`, generate the application key, migrate, and run `php artisan db:seed`. Provision staff using `php artisan portal:create-staff EMAIL --role=administrator`. The interactive prompt keeps passwords out of shell history. `portal:local-accounts` is available only with a local SQLite environment.

## Acceptance walkthrough

1. Sign in as the author, select **New draft**, fill every required field and save. The record remains invisible to guests.
2. Select **submit** and confirm. The author can preview but cannot edit or approve the submitted record.
3. Sign out and sign in as the reviewer. Open the record and check its source. Select **approve**, then **publish**, confirming each action.
4. Select **View public page**. The title, body, official source, verification date and update date appear on the public portal.
5. As administrator, open **Users & roles** to create staff or change another user's roles. Open **Permission matrix → Edit role permissions** to change granular grants.
6. Open **Audit history** to inspect the actor, transition, timestamp and before/after values. The database rejects updates and deletes against audit records.
7. To schedule instead of publishing, approve a record then choose **schedule**. Specify the local time; the browser sends UTC. The scheduler publishes due records and archives expired records. Repeated runs do not duplicate audit transitions.

## Baseline roles

| Role | Baseline access |
| --- | --- |
| Guest | Current verified public content only |
| Registered User | No CMS access |
| Content Author | Create, view/edit own drafts, submit for review |
| Reviewer / Editor | View submissions, return, approve, schedule, publish, archive |
| Tool Manager | CMS access and tool-management permission; tool administration UI is pending |
| Support / Operations | CMS access and operations permission; operations dashboard is pending |
| Administrator | All baseline permissions, user creation/role assignment, role permission editing, audit history |

All grants are checked on the server for each request. UI visibility is secondary. Independent review remains mandatory even for administrators. Authors cannot modify submitted content. No user can change their own roles or edit a role assigned to them, and the administrator role is protected against grant editing. Baseline re-seeding preserves edited non-administrator grants.

## Session/API contract

All paths below are prefixed by `/api/v1` and use JSON. The React app reaches Laravel through the same-origin proxy. There is no browser token in localStorage.

| Method / path | Behaviour / authorization |
| --- | --- |
| GET `/session/csrf` | Establish session and return CSRF token; no-store |
| GET `/session` | User identity, roles and permission names, or null |
| POST `/session` | Email/password login, CSRF, login rate limiting, session regeneration |
| DELETE `/session` | Logout, invalidate session, rotate CSRF token |
| GET `/admin/content` | CMS access; results scoped by type permission and ownership |
| POST `/admin/content` | Type-specific create permission; status/author/reviewer cannot be injected |
| GET `/admin/content/{id}` | Content view policy |
| PUT `/admin/content/{id}` | Draft update policy, fixed type/locale, transaction and audit |
| POST `/admin/content/{id}/transitions` | Action-specific policy and state validation, row lock and audit |
| GET/POST `/admin/users` | `users.manage` |
| PUT `/admin/users/{id}/roles` | `users.manage`, no self-changes, transaction and audit |
| GET `/admin/roles`, `/admin/permissions` | `roles.view` |
| PUT `/admin/roles/{id}/permissions` | `roles.manage`, cannot grant permissions the actor lacks; no own/protected-role edits |
| GET `/admin/audit` | `audit.view`, paginated read-only history |

Write requests require `X-CSRF-TOKEN` and the session cookie. Errors use Laravel JSON message/errors with 401/403/419/422/429 as applicable. Staff responses have private/no-store cache headers. Source URLs allow HTTP/HTTPS only and are not fetched by the server.

## Automated checks

```powershell
# From the project root; Chrome must be installed for browser tests.
npm run build
npm run test:browser
cd backend
..\.cache\php84\php.exe artisan test
..\.cache\php84\php.exe vendor/bin/pint --test
```

Browser tests build a new isolated SQLite database under `.cache/browser-*`, create synthetic test users, run real cookie/CSRF requests, and stop the test servers. They do not reset the working database. Browser screenshots are saved under `frontend/test-results`.

## Still pending from the full SRS

This increment implements staff authentication, RBAC, core CMS and publishing workflow. It does **not** complete public account registration/verification/recovery, administrator MFA, account sessions/revocation/export, typed job/result detail models, taxonomy/media management, corrections/versioning, saved alerts, subscriptions, file tools, SSR/SEO acceptance, distributed operations, or production security/DR acceptance. Do not deploy it as the completed SRS.
