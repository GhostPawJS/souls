import type { SoulsDb } from '../database.ts';

export function countEntries(db: SoulsDb, sourceId?: string): number {
	if (sourceId) {
		const row = db
			.prepare(`SELECT COUNT(*) AS cnt FROM ether_entries WHERE source_id = ?`)
			.get<{ cnt: number }>(sourceId);
		return row?.cnt ?? 0;
	}
	const row = db.prepare(`SELECT COUNT(*) AS cnt FROM ether_entries`).get<{ cnt: number }>();
	return row?.cnt ?? 0;
}
