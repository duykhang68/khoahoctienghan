# Editor Astro preview isolation — candidate

- Incident: PR #67, SHA ee5e9e0f6c3c9c0726d4e4f5a772efbecfc6f0c1, run 43598286778, job 132457442084. Actual draft preview E2E returned HTTP 400 on build; 58 tests passed, one failed, one skipped. No public deployment.
- Root cause under investigation: child process diagnostic was masked. A concrete isolation flaw in the preview implementation is that a symlink to the checkout node_modules shares Astro/Vite generated caches and can resolve real paths against the original project. This is a candidate cause, not confirmed by the old log.
- Candidate fix: copy installed dependencies into a private preview snapshot (copy-on-write when available), exclude generated caches, preserve relative npm bin symlinks, invoke the snapshot Astro CLI with explicit root. No dependency reinstall and no weakened gate. Preserve the original failed E2E and add a filesystem isolation regression. Capture bounded opt-in diagnostics only for the public integration fixture; no raw logs posted in issues.
- References: https://docs.astro.build/en/reference/configuration-reference/#cachedir and https://nodejs.org/api/fs.html#fspromisescpsrc-dest-options
- Verification: pending native CI on candidate SHA; do not close or publish as verified until the real preview test passes.

## Follow-up: HTTP 404 after successful build
- Run 43598629674, job 132458392653, SHA 475ac76bda62f50f729cfa1ace6694ebd8557f55: preview creation returned 200, but Playwright trace artifact 14115550347 records the preview document GET returning 404 and body `Not found`. The DOM assertion therefore failed before any image was tested. No evidence of missing image rendering at this stage.
- Source defect: the static HTTP handler closes over mutable `server`; after transfer to `active`, `server=null`, so `server.address()` throws inside the request handler and the catch sends 404. Replace that lookup with the accepted socket's `localPort`, retaining the strict Host check and existing path containment. Keep the existing rendering test and add explicit HTML and WebP HTTP status and binary equality assertions.
- Verification pending exact HEAD CI. The preceding build error is no longer reproduced by the second run, but this route fix is not yet verified. Keep incident open and do not merge until gates pass.
