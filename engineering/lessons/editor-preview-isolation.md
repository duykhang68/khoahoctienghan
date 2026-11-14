# Editor Astro preview isolation — candidate

- Incident: PR #67, SHA ee5e9e0f6c3c9c0726d4e4f5a772efbecfc6f0c1, run 43598286778, job 132457442084. Actual draft preview E2E returned HTTP 400 on build; 58 tests passed, one failed, one skipped. No public deployment.
- Root cause under investigation: child process diagnostic was masked. A concrete isolation flaw in the preview implementation is that a symlink to the checkout node_modules shares Astro/Vite generated caches and can resolve real paths against the original project. This is a candidate cause, not confirmed by the old log.
- Candidate fix: copy installed dependencies into a private preview snapshot (copy-on-write when available), exclude generated caches, preserve relative npm bin symlinks, invoke the snapshot Astro CLI with explicit root. No dependency reinstall and no weakened gate. Preserve the original failed E2E and add a filesystem isolation regression. Capture bounded opt-in diagnostics only for the public integration fixture; no raw logs posted in issues.
- References: https://docs.astro.build/en/reference/configuration-reference/#cachedir and https://nodejs.org/api/fs.html#fspromisescpsrc-dest-options
- Verification: pending native CI on candidate SHA; do not close or publish as verified until the real preview test passes.
