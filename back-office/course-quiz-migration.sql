-- P2.6: apply after P2.3 to dedicated COURSE_DB only.
CREATE TABLE course_lesson_quizzes (
 course_id TEXT NOT NULL REFERENCES course_curricula(course_id),
 lesson_id TEXT NOT NULL,
 version INTEGER NOT NULL CHECK(version>=1),
 document TEXT NOT NULL CHECK(json_valid(document) AND json_type(document)='array' AND length(CAST(document AS BLOB))<=262144),
 updated_at INTEGER NOT NULL,
 updated_by TEXT NOT NULL,
 PRIMARY KEY(course_id,lesson_id)
);
