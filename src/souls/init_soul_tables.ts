import type { SoulsDb } from '../database.ts';

export function initSoulTables(db: SoulsDb): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS souls (
			id             INTEGER PRIMARY KEY,
			name           TEXT NOT NULL,
			slug           TEXT,
			essence        TEXT NOT NULL,
			description    TEXT NOT NULL,
			level          INTEGER NOT NULL DEFAULT 1 CHECK(level >= 1),
			created_at     INTEGER NOT NULL,
			updated_at     INTEGER NOT NULL,
			deleted_at     INTEGER,
			last_attuned_at INTEGER,
			CHECK(length(trim(name)) > 0),
			CHECK(length(trim(essence)) > 0),
			CHECK(length(trim(description)) > 0)
		) STRICT
	`);

	db.exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_souls_name ON souls(name) WHERE deleted_at IS NULL`,
	);
	db.exec(
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_souls_slug ON souls(slug) WHERE slug IS NOT NULL AND deleted_at IS NULL`,
	);
	db.exec(`CREATE INDEX IF NOT EXISTS idx_souls_deleted_at ON souls(deleted_at)`);
}
