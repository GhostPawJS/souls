import type { SoulsDb } from '../database.ts';
import { mapSoulRow } from './map_soul_row.ts';
import type { SoulRow } from './types.ts';
export function getSoulByExternalId(db: SoulsDb, externalId: string) {
	const row = db.prepare('SELECT * FROM souls WHERE external_id=?').get<SoulRow>(externalId);
	return row ? mapSoulRow(row) : undefined;
}
