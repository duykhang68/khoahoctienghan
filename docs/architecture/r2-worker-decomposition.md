# R2 — Worker Decomposition (candidate)

R2 depends on R1 PR #201 and R0 PR #200; do not merge until both are accepted and current main is integrated. This is structural extraction, not R3 business rule redesign.

- worker.mjs is the Worker facade (existing named exports, fetch, scheduled). router.mjs preserves configuration, origin, auth routes, signed session, course details, scheduler, course write/tracking, method gate, course read, editorial fallback in that exact order.
- HTTP response/security headers/page/redirect live in http.mjs. auth/session.mjs retains signed-cookie rules; adapters/google-identity.mjs creates a verifier/cache per Worker instance. Do not export/use a route handler as an independent public Worker entrypoint.
- adapters/published-catalog.mjs and google-drive.mjs handle external I/O. repositories/course.mjs contains existing D1 reads; services/course.mjs and course-media.mjs keep existing guarded writes. R3 will extract pure decisions, not duplicate SQL guards.
- course/common.mjs and validation.mjs retain original functions and limits; views/ contains independent original server templates and emitted browser scripts. No markup, SQL, auth rules, API, migration, workflow, submodule or public site changes.
- Existing Node and Playwright suites remain required; new regression matrix asserts dispatch ordering, session gate, method and query handling. Preserve R1 asset sync and module-aware Worker deployment. A public Pages deployment is not private Worker verification.

Measured Worker source: 162778 bytes at R1 HEAD -> 1026 bytes in this candidate. Total code is redistributed; actual token budget depends on the selected task and dependencies. No tokenizer benchmark or production claim.
