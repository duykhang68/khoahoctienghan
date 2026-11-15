-- Apply once after the P2.1 schema, only to dedicated COURSE_DB.
ALTER TABLE courses ADD COLUMN description TEXT NOT NULL DEFAULT '' CHECK(length(description)<=4000);
ALTER TABLE courses ADD COLUMN level TEXT NOT NULL DEFAULT 'all' CHECK(level IN ('beginner','intermediate','advanced','all'));
ALTER TABLE courses ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1);
ALTER TABLE courses ADD COLUMN updated_by TEXT NOT NULL DEFAULT '';
CREATE TABLE course_audit (
 course_id TEXT NOT NULL REFERENCES courses(id),
 version INTEGER NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('create','edit','archive')),
 actor TEXT NOT NULL,
 occurred_at INTEGER NOT NULL,
 PRIMARY KEY(course_id,version)
);
CREATE TRIGGER course_audit_insert AFTER INSERT ON courses BEGIN
 INSERT INTO course_audit VALUES(NEW.id,NEW.version,'create',NEW.updated_by,NEW.updated_at);
END;
CREATE TRIGGER course_audit_update AFTER UPDATE ON courses BEGIN
 INSERT INTO course_audit VALUES(NEW.id,NEW.version,CASE WHEN NEW.status='archived' THEN 'archive' ELSE 'edit' END,NEW.updated_by,NEW.updated_at);
END;
