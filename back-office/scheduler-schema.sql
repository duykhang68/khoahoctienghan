CREATE TABLE IF NOT EXISTS scheduler_jobs (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, route TEXT NOT NULL, due_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL, consented_at INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('scheduled','sending','retry','awaiting_issue','submitted','blocked','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL, lease_until INTEGER, lease TEXT,
 receipt_sha TEXT, issue_number INTEGER, error_code TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS scheduler_route ON scheduler_jobs(route) WHERE state <> 'cancelled';
CREATE INDEX IF NOT EXISTS scheduler_due ON scheduler_jobs(state,due_at,created_at);
CREATE TABLE IF NOT EXISTS scheduler_chunks (
 job_id TEXT NOT NULL REFERENCES scheduler_jobs(id), part INTEGER NOT NULL, payload BLOB NOT NULL,
 PRIMARY KEY(job_id,part)
);
CREATE TABLE IF NOT EXISTS scheduler_health (id INTEGER PRIMARY KEY CHECK(id=1), last_tick INTEGER NOT NULL);
