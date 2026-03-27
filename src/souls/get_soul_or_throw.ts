import type { SoulsDb } from '../database.ts';
import { SoulsNotFoundError } from '../errors.ts';
import { mapSoulRow } from './map_soul_row.ts';
import type { SoulRecord, SoulRow } from './types.ts';

export function getSoulOrThrow(db: SoulsDb, id: number): SoulRecord {
	const row = db.prepare('SELECT * FROM souls WHERE id = ?').get<SoulRow>(id);
	if (!row) throw new SoulsNotFoundError(`Soul not found: ${id}`);
	return mapSoulRow(row);
}
