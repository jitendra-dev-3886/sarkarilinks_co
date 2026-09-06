# Homepage appearance and repeat visits

The administrator can publish five coordinated designs. Ocean remains the default. Navigation and tool names stay consistent when the design changes.

| Design | Appearance |
| --- | --- |
| Ocean | Blue/teal, light backgrounds, balanced cards and a split introduction |
| Forest | Mint/green, spacious sections and two-column cards |
| Studio | Indigo, centered introduction and a horizontal tools panel |
| Editorial | Warm cream, serif headings and notice-list layouts |
| Focus | Navy, restrained borders and compact sections |

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
