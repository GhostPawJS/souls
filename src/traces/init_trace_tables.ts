import type { SoulsDb } from '../database.ts';
export function initTraceTables(db: SoulsDb): void {
	db.exec(`CREATE TABLE IF NOT EXISTS soul_trace_texts (hash TEXT PRIMARY KEY, text TEXT NOT NULL) STRICT;
CREATE TABLE IF NOT EXISTS soul_trace_merges (trace_id INTEGER NOT NULL REFERENCES soul_traces(id), parent_id INTEGER NOT NULL REFERENCES soul_traces(id), created_at INTEGER NOT NULL, PRIMARY KEY(trace_id,parent_id)) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_trace_merge_parent ON soul_trace_merges(parent_id);
CREATE TABLE IF NOT EXISTS soul_traces (
  id           INTEGER PRIMARY KEY,
  text         TEXT    NOT NULL CHECK (length(trim(text)) > 0),   -- content only
  state        INTEGER NOT NULL DEFAULT 0 CHECK (state IN (0, 1, 2)), -- 0 open, 1 done, 2 dropped
  weight       REAL    CHECK (weight IS NULL OR (weight >= 0 AND weight <= 1)),
  created_at   INTEGER NOT NULL,          -- epoch ms; may be back-dated for past events
  updated_at   INTEGER NOT NULL,          -- epoch ms of the latest revision
  due_at       INTEGER,                   -- epoch ms or NULL
  settled_at   INTEGER,                   -- epoch ms or NULL
  settle_reason TEXT,
  supersedes   INTEGER REFERENCES soul_traces(id),
  revision     INTEGER NOT NULL DEFAULT 1,
  CHECK ((state = 0 AND settled_at IS NULL AND settle_reason IS NULL)
      OR (state IN (1, 2) AND settled_at IS NOT NULL AND settle_reason IS NOT NULL AND length(trim(settle_reason)) > 0))
) STRICT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_trace_supersedes ON soul_traces(supersedes) WHERE supersedes IS NOT NULL;

CREATE TABLE IF NOT EXISTS soul_trace_souls (            -- n:m link with a numeric role
  trace_id INTEGER NOT NULL REFERENCES soul_traces(id),
  soul_id  INTEGER NOT NULL REFERENCES souls(id),
  role     INTEGER NOT NULL CHECK (role IN (0, 1, 2)), -- 0 owner, 1 counterpart, 2 subject
  created_at INTEGER NOT NULL,
  PRIMARY KEY (trace_id, soul_id, role)
) STRICT;

CREATE TABLE IF NOT EXISTS soul_trace_tags (             -- categories only, never values
  trace_id INTEGER NOT NULL REFERENCES soul_traces(id),
  tag      TEXT    NOT NULL,
  PRIMARY KEY (trace_id, tag)
) STRICT;

CREATE TABLE IF NOT EXISTS soul_trace_revisions (        -- append-only, enforced by triggers
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id   INTEGER NOT NULL REFERENCES soul_traces(id),
  revision   INTEGER NOT NULL,
  kind       TEXT    NOT NULL,             -- record, revise, settle, link, unlink, tag, untag
  snapshot   TEXT    NOT NULL,             -- JSON of the trace after the change, links and tags included
  reason     TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (trace_id, revision)
) STRICT;
-- BEFORE UPDATE and BEFORE DELETE triggers on soul_trace_revisions RAISE(ABORT).
-- A BEFORE DELETE trigger on soul_traces RAISE(ABORT): traces are never deleted.

CREATE TABLE IF NOT EXISTS shard_traces (                -- a shard cites a trace as evidence
  shard_id   INTEGER NOT NULL REFERENCES soul_shards(id),
  trace_id   INTEGER NOT NULL REFERENCES soul_traces(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (shard_id, trace_id)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_trace_soul_role ON soul_trace_souls(soul_id, role);
CREATE INDEX IF NOT EXISTS idx_trace_state_due ON soul_traces(state, due_at);
CREATE INDEX IF NOT EXISTS idx_trace_updated ON soul_traces(updated_at);
CREATE INDEX IF NOT EXISTS idx_trace_revision_created ON soul_trace_revisions(created_at);
CREATE INDEX IF NOT EXISTS idx_trace_tag ON soul_trace_tags(tag);
CREATE INDEX IF NOT EXISTS idx_shard_trace ON shard_traces(trace_id);
CREATE TRIGGER IF NOT EXISTS trace_revision_no_update BEFORE UPDATE ON soul_trace_revisions BEGIN SELECT RAISE(ABORT, 'Trace revisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS trace_revision_no_delete BEFORE DELETE ON soul_trace_revisions BEGIN SELECT RAISE(ABORT, 'Trace revisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS trace_no_delete BEFORE DELETE ON soul_traces BEGIN SELECT RAISE(ABORT, 'Traces cannot be deleted'); END;
`);
}
