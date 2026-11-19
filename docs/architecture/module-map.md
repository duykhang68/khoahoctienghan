# R0 — Bản đồ module và hướng tách

Course Studio P2 đã ngừng hoạt động và bị gỡ khỏi Back Office; sơ đồ này chỉ ghi lại các module còn được duy trì.

Snapshot: 3e5e7a966a5c528cccbb920d48e435ebf93a04bd. Tên đường dẫn mới là đề xuất, chưa tồn tại. Nguồn định danh từ Git tree và audit trọng điểm; không phải dependency graph đầy đủ. Không di chuyển module thuần tốt chỉ để đổi tên.

| Tác vụ / file hiện tại | Core đích dự kiến | Shell / ranh giới |
| --- | --- | --- |
| worker: allow, verifyGoogle, authorized, seal/open, googleKeys | core/auth/{authorization,claims}.mjs | routes/auth.mjs; adapters/google-identity.mjs; signed cookies/JWKS; cache có lifecycle |
| worker: dashboardSnapshot, librarySnapshot, categorySnapshot, markup/scripts | core/editorial/{library,category}.mjs nếu có biến đổi thuần | back-office/routes/{library,categories,engineering}.mjs; views và network adapter |
| scripts/sync-back-office-assets.mjs + worker generated markers | không đưa generated vào core | back-office/generated/{editor-assets,sheets-assets}.mjs; adapters/asset-loader.mjs |
| src/lib/editor-v2/model.mjs: metadata, slugify, mergeRuns, toggleInline, richLines, inlineRuns, newBlock, buildDocument, prepareV2 | core/editorial/{metadata,rich-text,blocks,document,publication-plan}.mjs | UUID/hash/drawio/media adapter; facade tương thích, explicit now |
| src/lib/editor-v2/browser.mjs, revision.mjs, media.mjs, draft-schedule.mjs, drafts-browser.mjs | core/editorial/{editor-reducer,revision-parser,revision-plan,media-validation,draft-policy}.mjs | DOM/IndexedDB/localStorage/canvas/fetch |
| scripts/engineering-controller.mjs, engineering-policy.mjs, conflict-resolver.mjs, release-recovery.mjs, incident-publication.mjs | core/engineering/{failure-policy,merge-policy,ci-policy,branch-policy,conflict,incident-policy,release-policy}.mjs (ưu tiên tái sử dụng module hiện hữu) | scripts/adapters/github-cli.mjs; thin orchestrator |
| scripts/editor-v2-queue.mjs, editor-v2-queue-policy.mjs; advance, validatePR, productionVerified, queueHead, parseIssue | core/publication/{transition,pr-policy,verification,queue}.mjs | GitHub CLI/HTTP, queue lease/recheck, effect execution |
| back-office/server-scheduler.mjs: prepareSchedule, runScheduler, retryable, code | core/scheduler/{validation,transition,retry-policy}.mjs | repositories/scheduler.mjs; app credential adapter, cron, digest |
| scripts/sheet-writeback.mjs: verifiedReceipt; src/lib/sheet-blog/{model,browser,progress,progress-browser}.mjs: checkHeaders, listRows, rowDraft, recommendDestination, progressFor | core/publication/{receipt,sheet-rows,sheet-routing,progress}.mjs | sheets-client.mjs; OAuth, receipt storage, DOM |
| editor/apps/web/src/App.jsx, editor/apps/web/studio-adapter.mjs, editor-github/local-api.mjs | core/editorial/local-draft.mjs; shared normalization khi tương thích | React hooks, editor/app adapters, local HTTP middleware; không chạm submodule editor-original trong R0 |
| src/lib/techblog.ts, tech-categories.mjs, studio-document.mjs; scripts/check-content.mjs | core/editorial/{content-index,content-validation}.mjs; giữ pure category functions | scripts/adapters/content-filesystem.mjs; Astro data loading |

## Dependency graph đã quan sát (direct import, rút gọn)
- worker.mjs -> router.mjs, server-scheduler.mjs, adapters/google-identity.mjs; editor/sheets assets được nhúng bởi sync script.
- server-scheduler.mjs -> editor-v2/model.mjs, draft-schedule.mjs, github.mjs, sheet-blog/progress.mjs.
- editor-v2/model.mjs -> drawio-source.mjs, media.mjs.
- editor-v2/browser.mjs -> model, rich-browser, media, github, sheet-blog/progress-browser, series-progress, drawio-browser, blueprints.
- engineering-controller.mjs -> release-recovery, branch-auth, incident-publication, conflict-resolver, pr-labels, engineering-policy; node:child_process, node:fs.
- editor-v2-queue.mjs -> editor-v2-queue-policy, engineering-policy, release-recovery, sheet-writeback; node:child_process, node:fs, node:assert/strict.
- sync-back-office-assets.mjs -> knowledge-topics.ts, filesystem và source browser asset lists.

Đích: entrypoint -> route/controller -> use case/core + injected ports; adapters -> external services. Core chỉ import core/kiểu/hằng bất biến. Browser bundle phải dùng allowlist đường dẫn và dependency graph có thể deploy thật, không public hóa private modules.

## Chọn context theo tác vụ
Mở AGENTS.md, tài liệu này, lesson liên quan và đúng module + test. Chỉ mở route/adapters nếu thay đổi effect/API; không mở generated bundle, toàn bộ Worker hay toàn bộ bài viết theo mặc định. Khi chưa rõ entrypoint, đọc import/export hoặc tìm symbol trước. Không bỏ qua file liên quan khi bảo mật hoặc tính đúng yêu cầu đọc rộng hơn.
