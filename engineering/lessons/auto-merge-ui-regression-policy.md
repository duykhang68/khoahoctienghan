# Auto-merge review classification — UI browser regression specs

Status: candidate, verification pending.

Evidence: PR #48 CI run 43587308301 succeeded; reconcile run 43587351123 logged REVIEW_REQUIRED PR #48. PR #45 likewise changed UI and browser specs. Existing sensitiveFile treated every tests/ path as protected, causing ordinary UI changes to need a manual merge.

Fix: separate merge-review classification from known-fixer protection; narrowly permit added/modified tests/e2e/*.spec.ts accompanying owner ui/ or ux/ source changes. Preserve strict native branch rules, exact HEAD, all jobs successful, same-repo owner and draft guard. Test-only changes, removed or renamed tests, helpers and infrastructure remain review-required. No change to CI steps, required checks or permissions.

Regression: tests/branch-sync.test.mjs covers allowed UI case and rejected protected cases. Exact HEAD CI and real autonomous merge verification pending.
