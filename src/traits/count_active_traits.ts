import type { SoulsDb } from '../database.ts';

export function countActiveTraits(db: SoulsDb, soulId: number): number {
	const row = db
		.prepare(`SELECT COUNT(*) AS cnt FROM soul_traits WHERE soul_id = ? AND status = 'active'`)
		.get<{ cnt: number }>(soulId);
	return row?.cnt ?? 0;
}
