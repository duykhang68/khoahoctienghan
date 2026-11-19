# Điều tra issue và bài học Google Sheets Writeback — 20/11/2026

Status: **candidate investigation record**. Root cause on historical failed SHAs corroborated by code and job logs; fixed branch passed main CI and CD verification, but Google Sheet owner data path is not independently verified. Do not close #227/#228 based on this document alone.

## Evidence classification
- **SOURCE_PROVEN**: pinpoint failing source expression or test precondition on the exact failed HEAD.
- **FIX_CI_VERIFIED**: post-fix exact HEAD/main native CI succeeded.
- **DEPLOY_VERIFIED**: same merge SHA had CD prepare/deploy/verify all succeed; this is not an authenticated user acceptance test.
- **OWNER_UAT_PENDING**: actual writeback or login requires a separate safe end-to-end observation.
- **UNDETERMINED**: log identifies failed job/step but not a confirmed root cause.
- **SUPERSEDED / DEPRECATED**: compare current PR status, later replacements and feature-removal scope before spending retries; never silently close issue.

## Issue #227 — test fixture did not pass legacy precondition
- Run: https://github.com/duykhang68/khoahoctienghan/actions/runs/44638994535
- Job: 135964811229; failed HEAD: `2f35ad4f233b935c1e26a68f363fbac86c791e84`.
- Signature: test at `tests/sheet-writeback.test.mjs:53` got null, and test at line 62 expected `SHEET_ID_CONFLICT` but no rejection happened.
- Direct source comparison: `legacyDraftText()` requires normalized legacy body length >=32. The regression fixture had only `Dòng một` and `Dòng hai`, yielding less than 32 characters and an intentional null result. The tested branch never reached the foreign-ID guard.
- Fix in PR #226: realistic multi-paragraph immutable fixture above the threshold, with changed/duplicate/foreign-ID and idempotency coverage. Never lower the safety threshold to make tests green.
- Generalizable rule: prove both **preconditions** and **postconditions** for a negative test; include boundary cases that assert fail-closed semantics.

## Issue #228 — null dereference after a successful legacy write
- Run: https://github.com/duykhang68/khoahoctienghan/actions/runs/44639168760
- Job: 135965451613; failed HEAD: `3b13a3932e7c7d8889016b71f9f300ce67ecad92`.
- Signature: `TypeError: Cannot read properties of null (reading 'fingerprint')` at `scripts/sheet-writeback.mjs:70`, in legacy VERIFIED reconciliation.
- Direct source comparison: legacy branch sets `source=null` and `legacy` to canonical text, but post-PUT reread still accessed `source.fingerprint`. Source and legacy paths were not guarded consistently across all phases.
- Fix in PR #226: post-write verification compares row fingerprint for linked source, or full canonical body for legacy. Keep fresh reread, conflict guard, no overwrite, and idempotence.
- Generalizable rule: review every use of nullable state across **candidate selection → matching → pre-write → PUT → post-write → retry**; don't stop after a guard at function entry.

## Verification ledger
- PR #226: https://github.com/duykhang68/khoahoctienghan/pull/226 ; squash merge SHA `31033f88bf6d751888ed03fa834243efc0640196`.
- Native main CI run `44639695075` = success on exact SHA.
- CD run `44639953956` = prepare/deploy/verify success on same SHA.
- Owner-authenticated Google Sheets backfill/Content ID verification for this merge is **not independently checked here**. Keep issues open until final acceptance or explicit supersession.
- Post publication must separate fixed test regression from unverified Google Sheet production behavior.

## Triage runbook for new UNKNOWN
1. Capture issue / run / failing job / failing step / exact SHA, never raw sensitive logs.
2. Group incidents by normalized **signature + affected path + SHA ancestry**, not only issue count. If the same signature repeats, cross-link rather than blindly create a new fix.
3. Inspect code **at failed HEAD**, identify actual failed assertion or runtime expression. Look for precondition mismatch before blaming the feature.
4. Compare with **current main** and PR states. Record whether an existing patch already addresses the signature; do not reopen a stale fix.
5. Reproduce with a minimal safe fixture. For unknown causes, state hypothesis and missing evidence; do not issue false root-cause declarations.
6. Implement narrow fix + regression; preserve fail-closed/credentials/exact-SHA guards and zero unnecessary retries.
7. Check native PR CI → exact main CI → CD verify → owner UAT **as separate gates**. Only then promote a candidate lesson, close issue and queue its own `bugfix-issue-<number>` retrospective under Editor V2 FIFO priority.

## Other investigations requiring evidence
- #222: failed E2E navigation to `example.test` and `chrome-error://chromewebdata/`; need browser trace and comparison with current test/source; not proof of product error.
- #159/#154: dashboards/catalog show missing counts or generic 502; exact failed GitHub upstream versus release artifact remains unconfirmed.
- #53: manual CD recovered one release; exact service-side reason for missing automatic trigger and permanent self-recovery not proven.
- #3: owner supplied environment protection rejection; require current environment policy and new exact-SHA deployment validation.
- #116: Worker JWKS fetch/signature rejection path verified; actual authorized Google Sign-in owner UAT pending.
- #197/#199/#208: historical E2E test failure explanations exist and parent PRs are now merged; still distinguish CI/deploy from final owner UAT; Course Studio removal PR #229 may supersede further feature-specific repair.
- #221 and other conflict issues: corresponding PR may already be merged while the incident remains open. Research exact SHA/revision ancestry or supersession; never blanket ours/theirs.

References: [GitHub Issues](https://github.com/duykhang68/khoahoctienghan/issues?q=is%3Aissue+state%3Aopen), [Playwright locators](https://playwright.dev/docs/locators), [GitHub Actions workflow runs](https://docs.github.com/en/rest/actions/workflow-runs), [Google Sheets values update](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/update).
