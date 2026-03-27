import type { SoulsDb } from '../database.ts';
import { mapSoulRow } from './map_soul_row.ts';
import type { SoulRecord, SoulRow } from './types.ts';

export function getSoulByName(db: SoulsDb, name: string): SoulRecord | undefined {
	const row = db
		.prepare('SELECT * FROM souls WHERE name = ? AND deleted_at IS NULL')
		.get<SoulRow>(name);
	return row ? mapSoulRow(row) : undefined;
}
