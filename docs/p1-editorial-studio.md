# P1 — Duy Nguyen Editorial Studio

Status: P0.1 accepted on 2026-11-15 (GMT+7); P1 implementation unlocked by owner acceptance. See [P0.1 acceptance evidence](p0-1-acceptance.md). Do not ship admin pages on GitHub Pages.

One logical change = one PR, target main. Preserve existing public URLs and content contracts. Vietnamese, light mode, pastel, accessible responsive UI. No handwritten Markdown; use structured visual blocks and shared adapters for Knowledge Base and Tech Blog. Reuse Editor V2, Sheets publisher and FIFO; do not duplicate publishing engines. Preserve original editor submodule.

| Stage | Scope | Acceptance |
|---|---|---|
| P1.1 | Authenticated unified dashboard | Admin-only routes/assets/API, real counts, no mock production data |
| P1.2 | Visual WYSIWYG | Selection formatting, visual blocks, diagrams, live preview, round-trip preserves content |
| P1.3 | Content library | Load published content, search, edit/delete via reviewed PR, preserve slugs and detect stale versions |
| P1.4 | Category management | Drag/drop and keyboard reorder of approved navigation, preserve routes and automatic Tech Blog taxonomy |
| P1.5 | Media | Local uploads, WebP conversion, dimensions, alt text, validation, shared rules |
| P1.6 | Drafts and schedule | Private persistent drafts, explicit publication consent, GMT+7 seconds, idempotent scheduled submission, no exact timing guarantee |
| P1.7 | Sheets | Reuse VN source and explicit authorization, preserve fingerprint and verified SHA writeback |
| P1.8 | Pipeline | Issue, PR, exact HEAD CI, merge, deployment and verified production; no invented progress |
| P1.9 | Integration | Desktop/mobile, keyboard, anonymous/unauthorized denial, draft privacy, content round-trip, FIFO and actual production verification |

No private drafts in public repository or public artifacts. Server authorization for every admin endpoint. Keep GitHub App credentials server-side, scoped to this repository; public publication only after explicit consent. Scheduling must respect FIFO, retries and deduplication. No new payment, membership, or student work in P1.

Existing implementation references: docs/editor-v2.md, docs/google-sheet-blog.md, EDITOR-ORIGINAL.md, back-office/README.md, AGENTS.md. P0.1 gate requires real login/logout, wrong account denial, direct-route and preview checks, and migration of existing public administration pages. Do not bypass this gate.
