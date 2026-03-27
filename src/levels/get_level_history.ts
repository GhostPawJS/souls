import type { SoulsDb } from '../database.ts';
import { mapLevelRow } from './map_level_row.ts';
import type { LevelRecord, LevelRow } from './types.ts';

export function getLevelHistory(db: SoulsDb, soulId: number): LevelRecord[] {
	const rows = db
		.prepare(`SELECT * FROM soul_levels WHERE soul_id = ? ORDER BY level ASC`)
		.all<LevelRow>(soulId);
	return rows.map(mapLevelRow);
}
