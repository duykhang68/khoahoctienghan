-- P2.8: apply after course-management, curriculum, lesson, media and quiz migrations.
CREATE TABLE course_review_revision (
 course_id TEXT PRIMARY KEY REFERENCES courses(id),
 revision INTEGER NOT NULL CHECK(revision>=1)
);
INSERT INTO course_review_revision SELECT id,1 FROM courses;
CREATE TABLE course_releases (
 course_id TEXT PRIMARY KEY REFERENCES courses(id),
 revision INTEGER NOT NULL,
 version INTEGER NOT NULL,
 metadata TEXT NOT NULL CHECK(json_valid(metadata)),
 curriculum TEXT NOT NULL CHECK(json_valid(curriculum)),
 approved_at INTEGER NOT NULL,
 approved_by TEXT NOT NULL
);
CREATE TABLE course_release_lessons (
 course_id TEXT NOT NULL REFERENCES course_releases(course_id),
 lesson_id TEXT NOT NULL,
 document TEXT NOT NULL CHECK(json_valid(document)),
 quiz TEXT NOT NULL CHECK(json_valid(quiz)),
 PRIMARY KEY(course_id,lesson_id)
);
CREATE VIEW course_release_readiness AS
 SELECT c.id,c.status,c.version,r.revision,
 (SELECT count(*) FROM json_each(k.structure) ch) AS chapters,
 (SELECT count(*) FROM json_each(k.structure) ch,json_each(ch.value,'$.lessons') l) AS lessons,
 (SELECT count(*) FROM json_each(k.structure) ch WHERE json_array_length(ch.value,'$.lessons')=0) AS empty_chapters,
 (SELECT count(*) FROM json_each(k.structure) ch,json_each(ch.value,'$.lessons') l
 LEFT JOIN course_lesson_documents d ON d.course_id=c.id AND d.lesson_id=json_extract(l.value,'$.id')
 WHERE d.document IS NULL OR json_array_length(d.document)=0) AS missing_lessons,
 (SELECT count(*) FROM course_lesson_media m WHERE m.course_id=c.id) AS media_links,
 length(trim(c.description)) AS description_length
 FROM courses c JOIN course_review_revision r ON r.course_id=c.id
 LEFT JOIN course_curricula k ON k.course_id=c.id;
CREATE TRIGGER release_course_insert AFTER INSERT ON courses BEGIN
 INSERT INTO course_review_revision VALUES(NEW.id,1);
END;
CREATE TRIGGER release_course_edit AFTER UPDATE ON courses WHEN NOT (OLD.status='draft' AND NEW.status='ready') BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=NEW.id;
END;
CREATE TRIGGER release_revision_curriculum_insert AFTER INSERT ON course_curricula BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=NEW.course_id;
END;
CREATE TRIGGER release_revision_curriculum_update AFTER UPDATE ON course_curricula BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=NEW.course_id;
END;
CREATE TRIGGER release_revision_curriculum_delete AFTER DELETE ON course_curricula BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=OLD.course_id;
END;
CREATE TRIGGER release_revision_lesson_insert AFTER INSERT ON course_lesson_documents BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=NEW.course_id;
END;
CREATE TRIGGER release_revision_lesson_update AFTER UPDATE ON course_lesson_documents BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=NEW.course_id;
END;
CREATE TRIGGER release_revision_lesson_delete AFTER DELETE ON course_lesson_documents BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=OLD.course_id;
END;
CREATE TRIGGER release_revision_quiz_insert AFTER INSERT ON course_lesson_quizzes BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=NEW.course_id;
END;
CREATE TRIGGER release_revision_quiz_update AFTER UPDATE ON course_lesson_quizzes BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=NEW.course_id;
END;
CREATE TRIGGER release_revision_quiz_delete AFTER DELETE ON course_lesson_quizzes BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=OLD.course_id;
END;
CREATE TRIGGER release_revision_media_insert AFTER INSERT ON course_lesson_media BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=NEW.course_id;
END;
CREATE TRIGGER release_revision_media_update AFTER UPDATE ON course_lesson_media BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=NEW.course_id;
END;
CREATE TRIGGER release_revision_media_delete AFTER DELETE ON course_lesson_media BEGIN
 UPDATE course_review_revision SET revision=revision+1 WHERE course_id=OLD.course_id;
END;
CREATE TRIGGER release_snapshot AFTER UPDATE OF status ON courses
 WHEN OLD.status='draft' AND NEW.status='ready' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM course_release_readiness v WHERE v.id=NEW.id
 AND v.chapters>0 AND v.lessons>0 AND v.empty_chapters=0 AND v.missing_lessons=0 AND v.media_links=0 AND v.description_length>0)
 THEN RAISE(ABORT,'COURSE_NOT_READY') END;
 INSERT INTO course_releases(course_id,revision,version,metadata,curriculum,approved_at,approved_by)
 SELECT NEW.id,r.revision,NEW.version,json_object('id',NEW.id,'slug',NEW.slug,'title',NEW.title,'description',NEW.description,'level',NEW.level),k.structure,NEW.updated_at,NEW.updated_by
 FROM course_curricula k JOIN course_review_revision r ON r.course_id=k.course_id WHERE k.course_id=NEW.id;
 INSERT INTO course_release_lessons(course_id,lesson_id,document,quiz)
 SELECT NEW.id,d.lesson_id,d.document,coalesce(q.document,'[]')
 FROM course_curricula k,json_each(k.structure) ch,json_each(ch.value,'$.lessons') l
 JOIN course_lesson_documents d ON d.course_id=k.course_id AND d.lesson_id=json_extract(l.value,'$.id')
 LEFT JOIN course_lesson_quizzes q ON q.course_id=d.course_id AND q.lesson_id=d.lesson_id
 WHERE k.course_id=NEW.id;
END;
CREATE TRIGGER immutable_course_releases_update BEFORE UPDATE ON course_releases BEGIN SELECT RAISE(ABORT,'IMMUTABLE_RELEASE'); END;
CREATE TRIGGER immutable_course_releases_delete BEFORE DELETE ON course_releases BEGIN SELECT RAISE(ABORT,'IMMUTABLE_RELEASE'); END;
CREATE TRIGGER immutable_course_release_lessons_update BEFORE UPDATE ON course_release_lessons BEGIN SELECT RAISE(ABORT,'IMMUTABLE_RELEASE'); END;
CREATE TRIGGER immutable_course_release_lessons_delete BEFORE DELETE ON course_release_lessons BEGIN SELECT RAISE(ABORT,'IMMUTABLE_RELEASE'); END;
