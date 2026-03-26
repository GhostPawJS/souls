import type { SoulsDb } from './database.ts';

export function getSchemaVersion(db: SoulsDb): string {
	const stmt = db.prepare('SELECT value FROM souls_meta WHERE key = ?');
	const row = stmt.get<{ value: string }>('schema_version');
	return row?.value ?? '0';
}
