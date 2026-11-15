# P2.9 — Course Studio Integration

Prerequisites: merge P2.5 #172, P2.6 #173, P2.7 #175, P2.8 #176 in order; reconcile main and all conflicts before marking ready. This test-only PR intentionally fails closed while required migrations/routes are absent. Do not skip or weaken tests.

- `npm run test:back-office`: actual SQLite in-memory schema and Worker request round-trip with signed fixture identity; no production access.
- `npm run test:e2e -- --grep 'private course preview'`: Chromium desktop/mobile, route intercepted to real Worker + SQLite; keyboard, save/reload and preview navigation.
- Local SQLite verification: seven byte-identical migration blobs verified against GitHub SHA, migrations executed; empty approval rollback, review revision, media gate, immutable snapshot and quiz retention passed. This is SQL-level evidence only, not D1 or browser verification.
- Still required: real private Drive API listing/range/captions/transcript and permissions, immutable media version design, media/quiz preview integration, full browser CI, approved D1 migrations, authenticated owner UAT and exact production release. These cannot be substituted by mock fixtures. No public publishing or paid storefront.
