# Reddit Editor migration

Owner decision: supersede PR #67 without merging. Clean base `0323f0c553190b37d2627b5c215a1fdd9cef7092`; upstream `1a1c3f3efc72b530c1c76ce494bdebd8baa3f795`. Source modules in `editor/apps/web/src` retain their upstream implementation where possible. Keep existing Astro content and Visual Editorial 2.0 unchanged. Separate editor dependency lock and local-only Vite host; no server credentials or Blogger/Drive integrations.

M1: migration of React/TipTap canvas and post library with both destinations and local draft UX. M2: lossless native adapters and shared visual node renderer with validated WebP assets and real preview. M3: authenticated draft-only GitHub publishing and release status, edit/delete/duplicate accepted against actual repository. M4: desktop/mobile regression and authenticated owner acceptance. No claim of M2–M4 completion; do not mark ready until appropriate gates and review.
