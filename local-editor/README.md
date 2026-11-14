
# Duy Nguyen Editorial Studio (localhost)

Node 24+, updated checkout: `npm ci` then `npm run editor`, open http://127.0.0.1:4317. Loopback only; never tunnel this port. The editor reads Git HEAD; browser drafts and bounded local revisions are separate from Git. Do not clear browser storage without saving important work.

Visual-only authoring for Knowledge Base and Tech Blog, structured visual inspector, image picker/drop/paste with WebP conversion, local image insertion, article duplication, guarded deletion and autosave. Tech Blog supports paragraph-boundary visual/image placement; supported MDX supports new visual blocks at block boundaries. Unsupported rich source is preserved; Knowledge Base image placement remains cover/end and preview is not pixel-exact Astro rendering. No raw source editor. Menu reorder is local; public menu parity is not yet acceptance-tested. Draft capacity and history depend on browser quota.

Connect a fine-grained repository PAT for Contents read/write, Pull requests read/write, Metadata read and Actions/Deployments read for tracking. Owner identity and push permission are checked. Token lives only in loopback server RAM; Disconnect/stop server clears it. Pull checks content hashes and blocks conflicting drafts. Sync explicitly stages validated assets/content in one commit on a content/editor-* branch and creates a PR. No direct main writes. The manual Publishing Dashboard distinguishes CI, merge, deployment and public marker. No polling. Existing PR branches and production are not modified by local editing.

Run `npm run check`, `npm run test:engineering`, `npm run build`, `node scripts/verify-build.mjs`, `npm run test:e2e`. Do not mark ready until exact current HEAD CI plus real authenticated publishing and manual browser acceptance pass. See engineering/EDITORIAL-STUDIO.md for remaining limitations.

Preview: use `Xem trước như blog thật` to build an explicit temporary Astro snapshot of supported draft content on a separate localhost port. Requires matching local checkout SHA, installed dependencies and `tar`; not a public deployment or OS sandbox. Advanced changed MDX/metadata is refused; update checkout/Pull if base differs. Close Editor to stop current preview. Canvas live preview remains approximate until opening the Astro build.
