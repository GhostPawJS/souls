import type { SoulsDb } from '../database.ts';
import { mapSoulRow } from './map_soul_row.ts';
import type { SoulRecord, SoulRow } from './types.ts';

export function listSouls(db: SoulsDb): SoulRecord[] {
	const rows = db
		.prepare('SELECT * FROM souls WHERE deleted_at IS NULL ORDER BY name ASC')
		.all<SoulRow>();
	return rows.map(mapSoulRow);
}
