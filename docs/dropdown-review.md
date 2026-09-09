# Selection control review

Short fixed choices now use the shared ChoiceSwitch component: homepage notice language, listing language and sort order, account preferred language, administrator content/import/taxonomy language, website reading size, image output format, media download format, and resume template/font/spacing.

Controls use native radio inputs with fieldset legends, unique group names, keyboard behavior, visible focus, checked state, and disabled-state support. Named inputs continue participating in FormData for administrator and media forms.

Longer or backend-managed choices remain native selects: content type, content status, destination section, taxonomy type, role assignments and permission editor, page to edit, and state/qualification/department/category filters. Native selects retain keyboard type-ahead and platform selection interfaces.

The unmounted legacy NoticeBoard component still contains a native language select; it is not part of the active homepage. No backend schema, permission, or API contract changes were made.
