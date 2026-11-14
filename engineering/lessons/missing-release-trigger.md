# Missing release trigger after token-originated merge — Issue #53
Status: candidate fix; permanent recovery not verified.

Evidence: PR #52 merge ca96b49d214e7a52acdb14ff6143066165b5b309; dispatch CI 43589541425 success with artifact 14110999728. CD 43589450285 verified the preceding SHA only. Manual CD 43589857331 verified the new SHA. Automatic release did not appear. GitHub documents workflow_run chain limits and workflow_dispatch exceptions; the exact service-side cause is not proven.

Fix: main dispatch CI hands off directly to CD in an isolated job after quality success. Native main pushes retain normal workflow_run release. CD waits briefly for the exact CI to complete and validates successful jobs and existing artifact; outdated requests skip. Release deduplicates by exact public marker and route checks after serialization. Existing reconciliation checks for absent exact-SHA CD with a one-minute event grace; no extra cron. Existing failed CD is handled by incident policy, not repeated missing-trigger dispatch.

Regression: tests/release-recovery.test.mjs; verify a real auto-merge and native main push through CD with all required jobs and exact public marker before closing #53.

References: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow ; https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run
