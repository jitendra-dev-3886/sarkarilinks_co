# MySQL cutover, essential navigation and master-data audit

Local cutover completed on 6 September 2026. The application now uses MySQL Community Server **8.0.45**, database **`sarkarilinks_co_live`**, on `127.0.0.1:3306`. Docker remains configured separately for MySQL 8.4. Runtime credentials are in the ignored `backend/.env`; a generated account has privileges on this application's database only. The supplied administrative password is not retained in the temporary connection file.

## What was preserved and checked

24 tables were copied, including 3 users, 6 roles, 59 permissions, 122 role-permission links, 4 content records, 4 advertisement imports, 25 audit records, 1 saved resume, sessions, tool configuration, appearance and information pages. Private uploaded files remain in their existing storage directory; database file references were retained.

Each copied table passed row-count and SHA-256 row comparison after type normalization (JSON key ordering, numeric representations, dates and UTC timestamps at the target schema's second precision). Source and target foreign-key checks passed. Both MySQL audit-protection triggers exist, and an actual audit update was rejected. Transaction-only live MySQL checks exercised draft visibility, publication, literal wildcard searches, closing dates and Hindi JSON; test content was rolled back.

The existing `sarkarilinks` database was left untouched. A first isolated attempt in `sarkarilinks_co` stopped on date-format verification before switching configuration; its copy transaction rolled back. That unused migration-created schema was retained for inspection. The successful target is `sarkarilinks_co_live`.

The successful private backup is `backend/storage/app/private/backups/mysql-cutover-20260906-075827/`, containing the SQLite snapshot, previous environment and `verification.json`. The original `backend/database/database.sqlite` also remains. Do not publish or commit backups; they include account data and application secrets.

The local queue and scheduler were restarted on MySQL, and API readiness and the frontend returned success. Use the already-running app at http://127.0.0.1:5173. On a later restart, start the existing MySQL80 Windows service, then run `npm.cmd run dev` once. Do not start duplicate queue/scheduler processes.

## Recovery and future migration

`scripts/migrate-sqlite-to-mysql.php --apply` is an explicit one-time migration utility. It requires SQLite as the configured source, maintenance mode, paused workers, no active extraction, and an empty target. It refuses occupied targets. It creates a backup, applies migrations, verifies the copy, generates database-scoped credentials and switches the environment only after checks pass. It is not a bidirectional synchronization tool or a general large-database streaming importer.

For rollback, first stop application writes and workers and preserve the current MySQL database and `.env`. Compare changes made since cutover before restoring the old SQLite snapshot/environment. A blind rollback would lose subsequent MySQL writes. Keep the MySQL source and backups until reconciliation is complete, clear Laravel configuration, then restart services on the selected database.

Browser tests continue using their isolated SQLite fixtures, never this live MySQL schema. Live MySQL transaction checks supplement those browser workflows; the full backend suite has not been run against an isolated MySQL test database.

## Are all masters created?

**No.** The following distinguishes existing management screens from completed/populated master data.

| Area | Actual state |
| --- | --- |
| Users, roles and permissions | User creation and role assignment work; grants are editable. Six roles and 59 permission names are predefined, not arbitrary role/permission creation masters. |
| State, qualification, department, category taxonomy | Create/update controls exist in Admin → Taxonomy, for English/Hindi. **Zero values are currently populated** in the working database. Delete/archive and bulk-import controls are not implemented. |
| Organization | Issuing organization is text on each notice. UPSC/SSC/IBPS/RRB/UPSSSC/BPSC links are searches. There is no organization CRUD master or official-feed integration. |
| Content types | Eight fixed types, including Admissions and Certificate Verification, with permission-checked publishing. There is no content-type CRUD editor. |
| Tools | Ten implemented tools have editable names, help and availability. Arbitrary tool creation and configurable processing-limit masters are not implemented. |
| Appearance | Five fixed designs and two reading sizes can be previewed and applied by the administrator. |
| Site information | Public business fields and text for seven fixed page slugs are administrator-editable. Real operator/contact details remain to be entered. |
| Languages | English and Hindi are supported; language creation is not implemented. |
| Menus, advertising, integrations, email alerts | No complete dynamic masters or operational integrations yet. |

No fabricated taxonomy values or notices were inserted to make the site appear complete. There are currently no publicly visible notices; publishing accurate reviewed content remains necessary.

## Simplified public layout

The footer now contains a short identity statement plus About Us, Privacy Policy, Terms of Use, Disclaimer, Contact Us and Sitemap. FAQ, organization shortcuts, the full category list and account/tool directories are available through Sitemap.

The homepage retains a compact search introduction, main category shortcuts, the exam notice board, latest/closing-soon jobs, returning-user shortcuts and three application tools. The repeated promotional workspace card, duplicate notice feed and resume promotion were removed. Five theme choices remain available, but their shared information hierarchy is intentionally concise.

## Final checks

50 backend tests (341 assertions) passed using explicitly isolated in-memory SQLite, and all 14 production-build browser workflows passed. Separate live-MySQL checks passed for staff login, protected CMS access and logout, as well as the transaction-only data checks above. The final frontend build passed. Desktop/mobile live-page inspection reported no JavaScript errors.
