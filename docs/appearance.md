# Homepage appearance and repeat visits

The administrator can publish five coordinated designs. Ocean remains the default. Navigation and tool names stay consistent when the design changes.

| Design | Appearance |
| --- | --- |
| Ocean | Deep navy/teal introduction, light notice cards and direct task shortcuts |
| Forest | Deep green/mint introduction, spacious sections and two-column cards |
| Studio | Dark indigo/lavender introduction and direct task shortcuts |
| Editorial | Dark brown/peach introduction, warm cream, serif headings and notice-list layouts |
| Focus | Deep navy/soft lime introduction, restrained borders and compact sections |

## Change the design

1. Sign in with the existing `administrator` role (the highest role, used as superadmin).
2. Open **Customize homepage**, or **Admin → Homepage appearance** at `/admin?tab=appearance`.
3. Select a design and **Standard (16 px)** or **Larger (18 px)** reading size.
4. Choose **Preview homepage** to review it in another tab. Only the signed-in administrator sees this preview.
5. Choose **Apply design to website** to save it for everyone.

The selection is stored in the database and recorded in the audit log. Open visitor tabs refresh their appearance settings within 60 seconds or on window focus; reloading also loads the saved design. Concurrent edits are rejected with a reload message rather than overwriting newer changes. Both the administrator role and `settings.manage` permission are required; giving that permission alone to another role does not grant access.

The additive `2026_09_06_000004_create_portal_appearance.php` migration is already applied locally. Run `php artisan migrate --force` with PHP 8.4 before serving this release on another deployment.

## Readability

Body text and form inputs start at 16 px, with an optional 18 px base. Local system fonts avoid an external font download; Hindi has a system-font fallback. Editorial uses serif headings while retaining system fonts for forms and body text. Labels, placeholders, keyboard focus and light backgrounds have clearer contrast. Primary controls have a minimum 44 px height. Relative text sizing, wrapping navigation and responsive layouts support enlarged text.

The design references [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [200% text resizing](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) and [target sizing](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). WCAG does not mandate a particular font family or a 16 px base. Automated checks cover selected contrast pairs, desktop/mobile reflow, enlarged text and form sizing; this is not a complete accessibility certification.

## Returning visitors

- Members get direct links to matching jobs, saved notices and preferences near the top of the homepage.
- Recently opened tools appear for guests and members. Only up to four tool identifiers are stored on the device; document contents and form inputs are not stored by this feature. **Clear recent tools** removes this history.
- The introduction becomes shorter when these returning-visitor shortcuts are present.
- **Latest jobs** and **Closing soon** use real publication/deadline data, with an honest empty state when nothing matches.

These features reduce repeat navigation. Retention improvements have not been measured, and no competitor comparison has been performed.

## API and verification

`GET /api/v1/appearance` returns `{data: {theme, text_size, version}}`. Authenticated `GET /api/v1/admin/appearance` reads the management state; `PUT` accepts those three fields with the current version and requires the session CSRF token. Only the five theme names and `standard|large` sizes are accepted. A stale version returns 409.

Backend tests cover authorization, validation, audit records, concurrent updates and initial HTML settings. A registration regression check ensures public browsing cannot consume account-creation attempts; registration, password changes, media submissions and advertisement submissions have separate rate-limit buckets. Browser tests preview and publish all five designs, check widths of 1440/390/320 px, larger reading size and 200% text scaling, and verify recent-tool privacy and member shortcuts. Run `node scripts/test-browser.mjs --built` after `npm.cmd run build --prefix frontend`. Tests use an isolated database and do not change the working site's design.


## Five structural homepage layouts

Administrator > Homepage appearance > choose a design > Preview homepage > Apply design to website. Each selection saves a complete layout and matching palette using the existing audited MySQL setting; previews remain administrator-only.

| Design | Structure | Intended use |
| --- | --- | --- |
| Ocean | Split search introduction and task panel, balanced cards | General-purpose starting point |
| Forest | Job workspace with exam-update sidebar on wide screens | Compare opportunities |
| Studio | Centered search, task tiles, separate tool cards | Search and document preparation |
| Editorial | Compact masthead, job rows, newspaper-style notice columns | Regular notice readers |
| Focus | Narrow page, compact shortcuts, stacked updates | Simple sequential scanning |

Small screens stack sections in document order. All choices retain search, saved-job actions, recent tools, closing-soon filtering, notice refresh and language selection. No automatic layout rotation: returning visitors keep a familiar navigation. Layout and color are paired selections, not independent controls.

Design rationale: [NN/g homepage guidance](https://www.nngroup.com/articles/top-ten-guidelines-for-homepage-usability/) supports clear primary tasks, visible search and real content; [W3C consistent navigation](https://www.w3.org/WAI/WCAG21/Understanding/consistent-navigation.html) supports stable ordering. These are established guidelines consulted for this update, not claims of a new study. Returning visits require fresh useful notices; compare repeat-visitor rate and successful search/tool use before claiming an improvement. No analytics tracker was added.


## Inner-page color consistency

The selected design also supplies the dark header palette for listings/search, the tool directory and tool detail pages, member sign-in, the member dashboard and administration. Cards, icons, filters, focus outlines and reading-page accents use the same shared theme tokens. Content and form surfaces remain light for reading. Status/error colors retain their meaning; printable resume templates retain their own document styling. No separate inner-page setting is required.


## Sixth structure: Classic notice board

In Admin > Homepage appearance, choose any color theme, then set **Homepage structure** to **06 / Classic notice board**. Preview and apply as usual. Select **Use selected theme layout** to restore the original five structures. The classic structure is independent of color: header/footer logo and inner-page colors follow the selected theme.

The compact masthead and category shortcuts lead to three desktop columns: Latest jobs, Results and Admit cards, followed by Admissions, Answer keys, Syllabus, Certificate verification, application tools and organization links. Each notice column fetches up to ten published notices. Language, refresh, closing-soon jobs, bookmarks and recent tools remain available. Empty categories are labelled honestly. On mobile, columns follow their source order.

Structure references reviewed: https://sarkariresult.com.cm/ , https://rojgarforum.com/ and https://sarkarilink.com/ . Their branding, claims, job listings, ads and assets are not imported.

Deployment: apply `2026_09_06_000007_add_home_layout_to_appearance` before serving the updated app. This additive migration has been applied to local MySQL; existing selections retain `home_layout=theme`. Layout updates use the same administrator-only permissions, optimistic version check and audit log as color updates.


## Hot jobs and latest updates

Every homepage structure includes a latest-updates ticker (eight newest published notices in the chosen locale) and up to four hot-job links, selected from the twelve newest published jobs excluding past closing dates in India time. Jobs without a closing date link to the notice for confirmation. Hot jobs is a recent-notice shortlist, not a popularity ranking or manual promotion setting. Classic language selection also updates these sections.

The ticker has pause/resume controls, pauses on hover or keyboard focus, pauses on touch, and disables automatic movement when reduced motion is requested. Links remain horizontally scrollable. Empty and failed requests have explicit messages; no sample notices are published to the live database.


## Optional Classic banner

With Homepage structure set to Classic notice board, the **Classic homepage banner** selector offers **Search banner** or **Quick start banner**. Quick start replaces only the top search introduction with four task cards: jobs, results, admit cards and saved jobs, plus a search-page link. Preview and apply use the existing administrator-only workflow. The default is unchanged; switching back restores the search block. No database migration is needed for this option.

Quick start follows the selected theme structurally: Ocean split cards, Forest vertical task list, Studio centered tiles, Editorial bulletin rows, and Focus compact buttons. The four destinations remain consistent. This changes only the optional banner.
