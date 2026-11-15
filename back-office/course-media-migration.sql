-- P2.5: private lesson media link records; Drive owns the binary files.
CREATE TABLE course_lesson_media (
 course_id TEXT NOT NULL REFERENCES course_curricula(course_id),
 lesson_id TEXT NOT NULL,
 file_id TEXT NOT NULL,
 linked_at INTEGER NOT NULL,
 linked_by TEXT NOT NULL,
 PRIMARY KEY(course_id,lesson_id,file_id)
);
