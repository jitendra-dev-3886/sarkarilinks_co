# Short administrator and staff manual

## Access and startup

Open http://127.0.0.1:5173. Staff sign in at `/login`; members use `/account/login`. If the site is stopped, ensure the **MySQL80** service is running, open a terminal in `C:\xampp\htdocs\sarkarilinks_co`, and run `npm.cmd run dev` once. This starts the API, frontend, queue and scheduler. Do not start another copy when they are already running.

## Who can do what?

| Role | Default responsibility |
| --- | --- |
| Administrator (superadmin) | Master values, users/role assignments, permission grants, appearance, site information, tools and audit history |
| Content Author | Own drafts, advertisement imports, master-tag selection and review submission |
| Reviewer / Editor | Independent source review, return/approve, publish/schedule and archive |
| Tool Manager | Tool names, help and availability |
| Support / Operations | Operational counts and import/queue status |
| Registered User | Personal preferences, saved jobs, saved resume and permitted member tools |

Permissions can be delegated, so the visible tabs may differ. In the working MySQL database, only `administrator` currently holds `taxonomy.manage`. Authors and reviewers can select existing master tags without permission to create master values.

## Add or update state/category/other masters

1. Sign in as Administrator and open **Admin → Taxonomy**.
2. Choose **Taxonomy**: `state`, `qualification`, `department` or `category`.
3. Choose **Language**: English or Hindi.
4. Enter **Label**, for example `Rajasthan`, and **Slug**, for example `rajasthan`.
5. Click **Save filter** and confirm it appears under its group.

Slugs use lowercase English letters, numbers and single hyphens. To change a label, submit the **same taxonomy, language and slug** with the corrected label. Changing the slug creates another value; it does not rename the existing key. Changes take effect immediately and are audited.

For Hindi, add a separate Hindi entry using the appropriate Hindi label and the same slug when it represents the same concept. There is no automatic translation. Delete/archive, bulk import and arbitrary taxonomy-type creation are not available yet.

## Let another staff role manage masters

1. Open **Admin → Permission matrix → Edit role permissions**.
2. Select an eligible staff role, for example **Support / Operations**.
3. Keep its existing permissions and enable `taxonomy.manage`; retain `cms.access`.
4. Click **Save permissions**. Refresh that staff user's workspace to show **Taxonomy**.
5. If necessary, assign that role through **Users & roles → Save roles**.

This changes access for **everyone assigned to that role**. Role editing cannot modify the Administrator role or a role assigned to the current editor. Another administrator must change your own role assignment. Do not grant a public-member role staff access merely to manage master values.

## Create and publish content

Follow the [simple workflow](quick-workflow.md). In a draft, expand **Search filters & classification** and select existing values matching the notice's language. Supported sections are Jobs, Results, Admit Cards, Answer Keys, Syllabus, Government Schemes, Admissions and Certificate Verification. These sections are predefined.

An uploaded PDF/image produces suggestions, not an approved notice. Review its text, dates, official source and destination section before creating a draft. Certificate Verification is a notice category; actual verification is performed by the issuing authority.

## Website settings

| Screen | How to use it |
| --- | --- |
| Homepage appearance | Select one of five designs and a reading size, preview, then apply |
| Site information | Set real public business name/email/address; select a page, edit its text and save |
| Manage tools | Update a tool's name/help/availability and save that tool |
| Audit history | Review recorded staff changes; audit records cannot be edited |

Privacy Policy and Terms of Use begin as drafts. Adapt them to actual operations before clearing their review flag. Enter the real operator name and support email first. Opening a published page shows the saved version, not unsaved editor changes.

The compact footer links to essential information pages. **Sitemap** contains the full category list, FAQ, organization searches, tools and account links. Organization shortcuts are searches, not an editable organization master.

## Common questions

| Problem | Check |
| --- | --- |
| Taxonomy tab is missing | The staff role needs both `cms.access` and `taxonomy.manage` |
| New filter is missing | Check the selected language, successful save and spelling of the slug |
| Filter returns no notices | Tag a notice with that value, then complete review/publication in the same language |
| Reviewer cannot approve a notice | The author cannot approve their own notice; use a different authorized reviewer |
| Homepage is empty | Only currently public, reviewed notices appear; drafts do not |
| Import is waiting | Check that the queue worker is running; Operations shows counts |
| Settings save reports a conflict | Another administrator saved newer settings; reload and reapply your change |

Database: MySQL `sarkarilinks_co_live`. Use [backup and recovery notes](mysql-cutover-and-masters.md) for database maintenance. Do not rerun the SQLite cutover utility on the active MySQL project.
