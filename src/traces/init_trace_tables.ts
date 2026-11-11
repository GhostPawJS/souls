import type { SoulsDb } from '../database.ts';
import { createIndex, createTable } from '../lib/schema_ddl.ts';
import { initTraceSearch } from './init_trace_search.ts';
export function initTraceTables(db: SoulsDb): void {
	createTable(db, 'soul_trace_texts', `hash TEXT PRIMARY KEY, text TEXT NOT NULL`);
	createTable(
		db,
		'soul_trace_merges',
		`trace_id INTEGER NOT NULL REFERENCES soul_traces(id), parent_id INTEGER NOT NULL REFERENCES soul_traces(id), created_at INTEGER NOT NULL, PRIMARY KEY(trace_id,parent_id)`,
	);
	createIndex(db, 'idx_trace_merge_parent', `soul_trace_merges(parent_id)`, true);
	// text is content only; states are 0 open, 1 done, 2 dropped.
	// created_at is epoch ms and may be back-dated; updated_at is the latest revision time.
	// due_at and settled_at are nullable epoch ms.
	createTable(
		db,
		'soul_traces',
		` id INTEGER PRIMARY KEY, text TEXT NOT NULL CHECK (length(trim(text)) > 0), state INTEGER NOT NULL DEFAULT 0 CHECK (state IN (0, 1, 2)), weight REAL CHECK (weight IS NULL OR (weight >= 0 AND weight <= 1)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, due_at INTEGER, settled_at INTEGER, settle_reason TEXT, supersedes INTEGER REFERENCES soul_traces(id), revision INTEGER NOT NULL DEFAULT 1, CHECK ((state = 0 AND settled_at IS NULL AND settle_reason IS NULL) OR (state IN (1, 2) AND settled_at IS NOT NULL AND settle_reason IS NOT NULL AND length(trim(settle_reason)) > 0)) `,
	);
	createIndex(
		db,
		'idx_trace_supersedes',
		`soul_traces(supersedes) WHERE supersedes IS NOT NULL`,
		true,
	);
	createTable(
		db,
		// Many-to-many links: role 0 owner, 1 counterpart, 2 subject.
		'soul_trace_souls',
		` trace_id INTEGER NOT NULL REFERENCES soul_traces(id), soul_id INTEGER NOT NULL REFERENCES souls(id), role INTEGER NOT NULL CHECK (role IN (0, 1, 2)), created_at INTEGER NOT NULL, PRIMARY KEY (trace_id, soul_id, role) `,
	);
	createTable(
		db,
		// Categories only, never values.
		'soul_trace_tags',
		` trace_id INTEGER NOT NULL REFERENCES soul_traces(id), tag TEXT NOT NULL, PRIMARY KEY (trace_id, tag) `,
	);
	createTable(
		db,
		// Append-only snapshots: record, revise, settle, link, unlink, tag, untag.
		// snapshot is JSON after the change, including links and tags.
		'soul_trace_revisions',
		` id INTEGER PRIMARY KEY AUTOINCREMENT, trace_id INTEGER NOT NULL REFERENCES soul_traces(id), revision INTEGER NOT NULL, kind TEXT NOT NULL, snapshot TEXT NOT NULL, reason TEXT, created_at INTEGER NOT NULL, UNIQUE (trace_id, revision) `,
	);
	createTable(
		db,
		// A shard cites a trace as evidence.
		'shard_traces',
		` shard_id INTEGER NOT NULL REFERENCES soul_shards(id), trace_id INTEGER NOT NULL REFERENCES soul_traces(id), created_at INTEGER NOT NULL, PRIMARY KEY (shard_id, trace_id) `,
	);
	createIndex(db, 'idx_trace_soul_role', `soul_trace_souls(soul_id, role)`);
	createIndex(db, 'idx_trace_state_due', `soul_traces(state, due_at)`);
	createIndex(db, 'idx_trace_updated', `soul_traces(updated_at)`);
	createIndex(db, 'idx_trace_revision_created', `soul_trace_revisions(created_at)`);
	createIndex(db, 'idx_trace_tag', `soul_trace_tags(tag)`);
	createIndex(db, 'idx_shard_trace', `shard_traces(trace_id)`);
	// BEFORE UPDATE/DELETE revision triggers abort; traces can never be deleted.
	db.exec(`CREATE TRIGGER IF NOT EXISTS trace_revision_no_update BEFORE UPDATE ON soul_trace_revisions BEGIN SELECT RAISE(ABORT, 'Trace revisions are append-only');
END;
CREATE TRIGGER IF NOT EXISTS trace_revision_no_delete BEFORE DELETE ON soul_trace_revisions BEGIN SELECT RAISE(ABORT, 'Trace revisions are append-only');
END;
CREATE TRIGGER IF NOT EXISTS trace_no_delete BEFORE DELETE ON soul_traces BEGIN SELECT RAISE(ABORT, 'Traces cannot be deleted');
END;`);
	initTraceSearch(db);
}
