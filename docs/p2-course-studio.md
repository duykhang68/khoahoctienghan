# P2 — Course Studio 1.0

Owner approved P2 on 2026-11-15 (GMT+7). P1 core accepted; P1.10 scheduler experimental and independent. One logical change per PR, native CI, exact main release, no unrelated changes.

| Stage | Deliverable | Acceptance |
|---|---|---|
| P2.1 | Course Dashboard | Private owner route, real D1 counts, explicit unavailable states, desktop/mobile |
| P2.2 | Course Management | Create/edit/archive drafts, stable ID/slug, validation, version checks and private audit |
| P2.3 | Curriculum Builder | Ordered chapters/lessons, drag and keyboard alternative, atomic reorder |
| P2.4 | Visual Lesson Editor | WYSIWYG structured blocks, Vietnamese/Hangul, local media uploads, preview; no handwritten Markdown |
| P2.5 | Video & Audio | Private objects, access control, limits, captions and transcripts; cost approval before provisioning |
| P2.6 | Quiz Builder | Visual question authoring, validation, correct answers held privately |
| P2.7 | Course Preview | Owner-only preview, student-like layout, no public drafts |
| P2.8 | Draft & Publishing | Explicit approval, immutable versions and readiness check; no storefront release yet |
| P2.9 | Integration | Auth, data integrity, mobile, keyboard, content round-trip, failure and recovery |
| P2.10 | Stable | Recorded CI/CD, real owner UAT and release evidence |

Architecture: keep public Knowledge Base/Tech Blog on GitHub Pages (noncommercial informational). Private Back Office uses existing signed Google allowlisted session. Dedicated COURSE_DB D1 binding, isolated from SCHEDULE_DB. No course content or student records in public GitHub. No payments, student auth, storefront or real paid publication in P2. Ready means editorial readiness, not on sale. Private media design and budget reviewed before resource creation. P2.1 SQL is read-only; schema migration and provision only in approved environment after review and CI, never silently create resources. Missing or failed DB yields unavailable rather than zero. All future mutation endpoints require server authorization, same-origin checks, validation, bounded input and concurrency control. Future P3–P10 depend on reviewed specs; not implemented here.
