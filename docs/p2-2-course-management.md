# P2.2 — Course Management

Private server-rendered create/edit/archive drafts at /admin/courses/manage/. Slug/ID immutable; optimistic version predicate and atomic audit triggers. No deletion, ready/publish transition, student data or payment. Apply P2.1 schema and then course-management-migration.sql once on dedicated COURSE_DB after review and verified main. Existing rows retain default metadata; do not reapply migration blindly. Test data only in isolated fixtures. Production UAT pending.
