-- P2.3: apply only after P2.2 on dedicated COURSE_DB.
CREATE TABLE course_curricula (
 course_id TEXT PRIMARY KEY NOT NULL REFERENCES courses(id),
 version INTEGER NOT NULL CHECK(version>=1),
 structure TEXT NOT NULL CHECK(json_valid(structure) AND json_type(structure)='array'),
 updated_at INTEGER NOT NULL,
 updated_by TEXT NOT NULL
);
