import type { SoulsDb } from './database.ts';

export function initSoulsTables(db: SoulsDb): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS souls_meta (
			key   TEXT PRIMARY KEY NOT NULL,
			value TEXT NOT NULL
		) STRICT;
	`);

	db.exec(`
		INSERT OR IGNORE INTO souls_meta (key, value)
		VALUES ('schema_version', '1');
	`);
}
