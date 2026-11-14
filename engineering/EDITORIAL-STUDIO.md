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

## E02 candidate — visual canvas
- Direct on-canvas title, summary and prose editing for both workspaces; basic inline bold/italic/code selection for supported Knowledge Base Markdown; no raw source editor. Existing structured diagrams are rendered as local previews, including metric bars, cycle/flow, table, palette, spacing and wireframe previews. Advanced MDX, nested Markdown and unsupported Tech Blog blocks remain protected; no claim of lossless editing for those blocks yet.
- Existing image export remains local-only. Shared production renderer parity, full structured visual editing, image insertion/upload and local browser acceptance remain pending. Do not mark ready or merge based solely on the public site build.
- Adds an explicit browser-script syntax regression to the engineering suite. Candidate pending CI.

## E05 candidate — structured visual inspector
- All nine existing schema kinds have a visual inspector with live local preview, caption, relevant fields, row/item controls and variant controls. Tech Blog can add/remove visuals in a section and saves them with the article. Knowledge Base edits existing literal IDs in the shared catalogue, with a warning that references share the same record; source MDX remains untouched. Advanced MDX supports existing recognized visual editing even when prose is protected. No author JSON or executable code is exposed (the code example block is display-only).
- New Knowledge Base block insertion, exact production-renderer parity, full image publishing, and end-to-end user acceptance remain pending. CI must pass before readiness; do not merge draft.

## E06 candidate — local WebP insertion
- Pick/drop/paste local raster, optimize using canvas, retain aspect for body or fixed contain frame for cover/square. Show actual preview, alt, caption, dimensions and size. Stage content-addressed immutable WebP binary with its article reference atomically in browser drafts; fail on storage quota. Explicit Sync validates bytes, hash, dimensions and references then uses GitHub base64 blob API and a single tree/commit/PR. No direct main write or implicit publication.
- Tech Blog supports cover and images at the end of the chosen section; Knowledge Base supports cover and end-of-lesson images for both Markdown and MDX via a route-keyed image index, without rewriting lesson source. Shared public body image component; existing cover layout retained. Arbitrary inline placement inside lesson prose and responsive variants remain future work. Single image limit 1.5 MB, browser draft capacity depends on browser quota; HEIC depends on browser decoding. Native CI and authenticated publishing acceptance still pending.

## E07 candidate — block placement
- Tech Blog visual blocks and body images have a validated paragraph boundary position; old articles without a position retain their original rendering order. The canvas and static page follow the same position rule. Existing reference sections keep their disclosure behavior. Supported Knowledge MDX can insert new catalogue visual blocks at a selected block boundary without exposing source. Markdown-to-MDX migration and inline Knowledge images remain pending, as does pixel-exact live Astro preview.
