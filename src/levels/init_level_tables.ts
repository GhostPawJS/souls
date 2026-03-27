import type { SoulsDb } from '../database.ts';

export function initLevelTables(db: SoulsDb): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS soul_levels (
			id                  INTEGER PRIMARY KEY,
			soul_id             INTEGER NOT NULL REFERENCES souls(id),
			level               INTEGER NOT NULL CHECK(level >= 2),
			essence_before      TEXT NOT NULL,
			essence_after       TEXT NOT NULL,
			traits_consolidated TEXT NOT NULL DEFAULT '[]',
			traits_promoted     TEXT NOT NULL DEFAULT '[]',
			traits_carried      TEXT NOT NULL DEFAULT '[]',
			traits_merged       TEXT NOT NULL DEFAULT '[]',
			created_at          INTEGER NOT NULL
		) STRICT
	`);

	db.exec(`CREATE INDEX IF NOT EXISTS idx_soul_levels_soul_id ON soul_levels(soul_id)`);
	db.exec(`CREATE INDEX IF NOT EXISTS idx_soul_levels_soul_level ON soul_levels(soul_id, level)`);
}
