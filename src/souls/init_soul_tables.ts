import type { SoulsDb } from '../database.ts';
import { addColumns, createIndex, createTable } from '../lib/schema_ddl.ts';

export function initSoulTables(db: SoulsDb): void {
	createTable(
		db,
		'souls',
		` id INTEGER PRIMARY KEY, name TEXT NOT NULL, slug TEXT, essence TEXT NOT NULL, description TEXT NOT NULL, level INTEGER NOT NULL DEFAULT 1 CHECK(level >= 1), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER, last_attuned_at INTEGER, CHECK(length(trim(name)) > 0), CHECK(length(trim(essence)) > 0), CHECK(length(trim(description)) > 0) `,
	);

	createIndex(db, 'idx_souls_name', `souls(name) WHERE deleted_at IS NULL`, true);
	createIndex(
		db,
		'idx_souls_slug',
		`souls(slug) WHERE slug IS NOT NULL AND deleted_at IS NULL`,
		true,
	);
	createIndex(db, 'idx_souls_deleted_at', `souls(deleted_at)`);
	addColumns(db, 'souls', { external_id: 'TEXT' });

	db.exec(
		'CREATE UNIQUE INDEX IF NOT EXISTS idx_souls_external_id ON souls(external_id) WHERE external_id IS NOT NULL',
	);
}
