import type { SoulsDb } from '../database.ts';
import { mapSoulRow } from './map_soul_row.ts';
import type { SoulRecord, SoulRow } from './types.ts';

export function getSoul(db: SoulsDb, id: number): SoulRecord | undefined {
	const row = db.prepare('SELECT * FROM souls WHERE id = ?').get<SoulRow>(id);
	return row ? mapSoulRow(row) : undefined;
}
