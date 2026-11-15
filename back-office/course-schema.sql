-- P2.1 course catalogue foundation; apply only to dedicated COURSE_DB.
CREATE TABLE IF NOT EXISTS courses (
 id TEXT PRIMARY KEY NOT NULL,
 slug TEXT NOT NULL UNIQUE,
 title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready','archived')),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS courses_status_idx ON courses(status);
