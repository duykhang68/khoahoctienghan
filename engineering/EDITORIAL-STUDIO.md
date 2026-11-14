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

## E08–E09 candidate — article lifecycle and local revisions
- Create, edit, duplicate and explicitly stage deletion for Tech Blog and non-core unlinked Knowledge leaves. Knowledge duplicates keep sibling paths and independent catalogue IDs; linked/protected routes are refused. Server repeats deletion/ref validation, writes only via PR. No automatic deletion of published binary assets.
- Debounced autosave on the visual canvas and save-before-navigation. Bounded local draft transaction history (up to 20 revisions, normally <=650 KB), Undo/Redo and restore; reset on changed base or conflicts. Image bytes are retained separately in drafts and only synced if referenced. History is best-effort persistent subject to browser storage, not GitHub version rollback. Full rich-text lossless editing and authenticated acceptance remain pending.

## E10–E11 candidate — publishing and quality gates
- Persistent local queue (25 submitted PRs, check 8 newest manually) with article title/route, submitted HEAD, live HEAD, native PR CI, merge SHA, Pages deployment evidence and public release marker ancestry. A public marker and three route checks confirm the observed release, not individual article contents or controller verify job. No polling, no automatic merge or deployment.
- Regression additions: actual loopback HTTP server with nonce/CSP/origin and unauthenticated publishing guard; fixture browser lifecycle, visual insertion, autosave, history, deletion, and visual/media tests. Real authenticated GitHub sync, comprehensive lossless WYSIWYG parity, protected route policies, responsive image variants and final manual browser acceptance remain blockers. Keep draft until confirmed; no production release from this candidate.

## E07 follow-up — Knowledge inline blocks
- Supported Knowledge Markdown/MDX now inserts paragraphs or structured components at selected blank-line boundaries. Markdown promotes to MDX in one draft transaction while retaining route and references. Inline WebP uses literal stable IDs, the shared EditorialImage production component, and validation of every ID/reference. Existing end-of-lesson images remain compatible. Move/remove standalone structured blocks with visible controls; unsupported executable/advanced content remains protected. Tech Blog adds a paragraph at a selected position. Pixel-exact Astro draft preview still requires separate acceptance work; do not claim full parity.

## E07 follow-up — real Astro preview candidate
- Explicit `Xem trước như blog thật` builds a temporary git-archive checkout with validated draft changes, using the same Astro production components/styles and separate loopback static server; no GitHub write, no deploy, no credentials passed to subprocess. Build uses installed dependencies; not an OS sandbox. Only the supported changed Markdown/MDX subset is compiled (canonical component imports, literal IDs, plain content), advanced changed metadata or executable syntax refused. Checkout SHA must match draft base. No background builds; previous preview replaced on successful next preview. Native CI and manual preview/build acceptance still required.

- Added a desktop integration regression which runs the real localhost service, builds a temporary Astro preview with a valid WebP and inline KnowledgeImage before a heading, checks rendered DOM order/intrinsic dimensions/legacy visual, and confirms the original checkout hash is unchanged. The normal two-project canvas tests remain intact. Await native CI for this exact HEAD.

- Preview isolation recovery candidate after run 43598286778: replace shared node_modules symlink with private installed dependency copy excluding mutable caches, explicit Astro root and bounded opt-in fixture diagnostics. Real preview regression remains mandatory; no gate changes. See engineering/lessons/editor-preview-isolation.md.

- Follow-up to preview run 43598629674: downloaded Playwright trace confirms HTTP 404 at the generated preview route after successful build. Fixed mutable server closure after ownership transfer; added document and binary asset HTTP status assertions without relaxing the existing DOM/order checks. Native CI pending.
