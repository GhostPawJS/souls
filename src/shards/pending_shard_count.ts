import type { SoulsDb } from '../database.ts';

export function pendingShardCount(db: SoulsDb, soulId: number): number {
	const row = db
		.prepare(
			`SELECT COUNT(*) AS cnt
			 FROM soul_shards ss
			 JOIN shard_souls sr ON sr.shard_id = ss.id
			 WHERE sr.soul_id = ? AND ss.status = 'pending' AND ss.sealed = 0`,
		)
		.get<{ cnt: number }>(soulId);
	return row?.cnt ?? 0;
}
