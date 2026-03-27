import type { SoulsDb } from '../database.ts';

export function initEtherTables(db: SoulsDb): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS ether_sources (
			id              TEXT PRIMARY KEY,
			kind            TEXT NOT NULL,
			url             TEXT NOT NULL,
			label           TEXT NOT NULL,
			etag            TEXT,
			last_fetched_at INTEGER,
			entry_count     INTEGER DEFAULT 0
		) STRICT
	`);

	db.exec(`
		CREATE TABLE IF NOT EXISTS ether_entries (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			source_id   TEXT NOT NULL REFERENCES ether_sources(id),
			external_id TEXT NOT NULL,
			name        TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			content     TEXT NOT NULL,
			category    TEXT,
			tags        TEXT,
			metadata    TEXT,
			fetched_at  INTEGER NOT NULL,
			UNIQUE(source_id, external_id)
		) STRICT
	`);

	db.exec(`CREATE INDEX IF NOT EXISTS idx_ether_entries_source ON ether_entries(source_id)`);

	db.exec(`
		CREATE VIRTUAL TABLE IF NOT EXISTS ether_fts USING fts5(
			name, description, content, tags,
			content='ether_entries', content_rowid='id'
		)
	`);
}
