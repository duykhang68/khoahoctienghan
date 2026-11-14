# Duy Nguyen Editorial Studio — E00 contract

One localhost-only studio, two workspaces (Knowledge Base and Tech Blog). Vietnamese, Light Mode, editorial palette and accessible controls. No Markdown, MDX, JSON or source editor exposed to authors. Existing storage formats remain internal. Preserve metadata, routes, existing visual blocks and rich content; fail closed if conversion is unsupported.

- E00–E01: visual shell, content/library navigation, local image preview and category/menu reorder UI. Existing Knowledge Base groups remain stable; reorder is an explicit owner action, no unrelated taxonomy changes. Tech Blog category inference stays unchanged until an override schema is agreed; no manual category required per article.
- E02–E04: lossless adapters, article-level content manager, true visual rich editing, undo/redo; fixture coverage including existing MDX/JSON. No forced source editing.
- E05–E07: all existing visual block editors, local file picker/drop/paste, persistent asset drafts, WebP binary storage and upload, shared production figure renderer and true Astro preview.
- E08–E11: autosave/revisions, guarded GitHub publishing, exact SHA tracker, full security/desktop/mobile regression. One logical change per PR, review required for config/automation changes.

## Shared image contract
Cover/thumbnail: 1600×900 (16:9) frame, contain/pad if necessary, no automatic crop. In-content: retain aspect ratio, longest edge <=1600 px, no upscaling. Educational card: 1200×1200 frame. WebP quality default .85, target cover <150 KB/body <300 KB (not hard caps; readable diagrams take precedence). Safe SVG only via validated component, no arbitrary SVG uploads. Responsive variants 480/768/1200/1600 when source size permits, intrinsic dimensions, alt text for meaningful images, optional captions, 8 px radius, lazy loading except LCP. Public renderer must be shared across both workspaces before parity is claimed.

## Acceptance gates
Actual browser editing without source code; local crop/contain and upload/insert, references/metadata maintained; menu drag and keyboard reorder with live preview; save/reopen and conflict handling; existing public routes and content unchanged; no arbitrary executable markup, credentials in public assets, or direct main write. Run native exact-HEAD CI and explicit desktop/mobile local editor tests before marking ready. Draft means incomplete, not production.
