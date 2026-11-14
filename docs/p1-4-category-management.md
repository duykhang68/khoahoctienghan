# P1.4 — Category Management

Private `/admin/categories/` has drag/drop on desktop and keyboard/touch-accessible up/down controls. It reads the actual published SHA and approved order in `src/data/knowledge-navigation.json`. The shared public build helper requires an exact permutation of the existing ten topic IDs; homepage, Knowledge Base category filter/menu and Starlight sidebar use the same order. Fixed navigation links remain in place; route IDs, titles, article contents, automatic Tech Blog taxonomy and Editor/Sheets internal category catalogue remain unchanged. Invalid order fails the build rather than silently losing categories.

Saving requires the existing owner-scoped PAT in memory, explicit consent and published SHA == current main; creates a draft PR changing only the order JSON. No direct main edit, auto-merge, new credentials or new paid resource. Unauthorized direct page/API access is denied by the existing Worker session gate. Private UI does not appear in GitHub Pages. Desktop drag is supplemented by visible up/down controls on mobile. Review native CI and diff before merge.

Dependency: P1.3 #131 must complete its release and review before P1.4 merges/deploys. No category order changes are made by this implementation PR: initial order exactly matches the current catalogue.
