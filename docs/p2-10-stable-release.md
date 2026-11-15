# P2.10 — Course Studio 1.0 stable release

Status: **BLOCKED — not stable or production-verified**. Assessment 2026-11-15 (GMT+7). This file is an acceptance ledger, not a deployment authorization or a release marker.

## Observed evidence

- Main at inspection: `ef6e4f9e8688727f1dcd8be8f17744e65e8627a6`. P2.5 #172 merged; main CI [43672872778](https://github.com/duykhang68/khoahoctienghan/actions/runs/43672872778) passed; public Pages CD [43672980715](https://github.com/duykhang68/khoahoctienghan/actions/runs/43672980715) was in progress. Pages CD is NOT evidence of private Worker or D1 deployment.
- P2.6 #173 conflict resolved on feature branch with current main and both features/test suites preserved; new HEAD `0cd8da3c625f7a5242d4cebcc6b160ffd03506c7`. Requires native CI on exact new HEAD.
- P2.7 #175 and P2.8 #176 conflict with new main; re-integrate individually after predecessor merges. Previous green checks on old HEAD do not qualify.
- P2.9 #177 failed [43672945378](https://github.com/duykhang68/khoahoctienghan/actions/runs/43672945378/job/132686789388) with ENOENT course-quiz-migration.sql; upstream migrations not all merged. Preserve failing integration gate; do not skip or weaken.

## Mandatory acceptance (all pending unless proven)

- [ ] #173, #175, #176, #177 individually reconciled, reviewed as required, native CI successful on exact integrated HEAD, squash-merged in dependency order.
- [ ] Real SQLite integration, desktop and mobile Playwright, keyboard, private routes, unauthorized and logout denial, stale update and recovery; exact integrated-main CI.
- [ ] Preview displays saved video/audio and quizzes privately, without leaking answer keys; captions and transcripts are supported and verified.
- [ ] Private Drive OAuth service-account listing and streaming/range, file membership, permissions, unavailable states; no public file sharing. Media-bearing approvals remain blocked until immutable media design verified.
- [ ] Reviewed COURSE_DB migration order P2.1 through P2.8; preflight backup and staging dry-run; explicit approval; preserve recovery path; never expose private database or credentials. No migration on public Pages.
- [ ] Private Worker deployment tied to reviewed main SHA and Cloudflare deployment ID; verify no-store, noindex, owner-only routes, public Pages isolation. Run production smoke against deployed revision.
- [ ] Actual owner UAT: create temporary draft, order chapters, save Hangul/Vietnamese lesson and image, link private media, author quiz, preview desktop/mobile, approve a disposable eligible course, verify immutable snapshot, logout and direct route denial. No real paid course or student data.
- [ ] Record final main SHA, CI/CD URLs, private Worker deployment version, D1 migration evidence and owner acceptance date; only then mark STABLE.

## Operational restriction

Until all acceptance items are proven, no stable tag, production readiness claim, public release, paid enrollment or P3 launch. Recheck exact current main and avoid indefinite polling. Do not include real answer keys, Drive IDs, credentials, session values or private course content in GitHub evidence.
