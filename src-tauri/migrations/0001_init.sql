-- rapor_app ilk şema
-- Geçmiş günlerin commit ve rapor verisini yerelde saklar.

CREATE TABLE IF NOT EXISTS repos (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    path     TEXT NOT NULL UNIQUE,
    name     TEXT NOT NULL,
    remote   TEXT,
    active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS commits (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id       INTEGER REFERENCES repos(id) ON DELETE CASCADE,
    sha           TEXT NOT NULL,
    committed_at  TEXT NOT NULL,          -- ISO 8601
    author        TEXT,
    message       TEXT NOT NULL,
    files_changed INTEGER NOT NULL DEFAULT 0,
    additions     INTEGER NOT NULL DEFAULT 0,
    deletions     INTEGER NOT NULL DEFAULT 0,
    diff_summary  TEXT,                   -- numstat/dosya listesi özeti
    source        TEXT NOT NULL DEFAULT 'local'  -- 'local' | 'github'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commits_sha_source ON commits(sha, source);
CREATE INDEX IF NOT EXISTS idx_commits_committed_at ON commits(committed_at);

CREATE TABLE IF NOT EXISTS reports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    report_date  TEXT NOT NULL UNIQUE,    -- YYYY-MM-DD
    summary_md   TEXT,
    standup_md   TEXT,
    technical_md TEXT,
    model        TEXT,
    mode         TEXT,                    -- 'cli' | 'api'
    created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);
