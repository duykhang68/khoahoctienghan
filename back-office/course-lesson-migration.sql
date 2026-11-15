-- P2.4: apply only after P2.3 on the dedicated COURSE_DB.
CREATE TABLE course_lesson_documents (
 course_id TEXT NOT NULL REFERENCES course_curricula(course_id),
 lesson_id TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version>=1),
 document TEXT NOT NULL CHECK(json_valid(document) AND json_type(document)='array' AND length(CAST(document AS BLOB))<=1500000),
 updated_at INTEGER NOT NULL,
 updated_by TEXT NOT NULL,
 PRIMARY KEY(course_id,lesson_id)
);
