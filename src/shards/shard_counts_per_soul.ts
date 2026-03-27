import type { SoulsDb } from '../database.ts';
import type { ShardCountRecord } from './types.ts';

export function shardCountsPerSoul(db: SoulsDb): ShardCountRecord[] {
	return db
		.prepare(
			`SELECT sr.soul_id AS soulId,
			        COUNT(*) AS pendingCount
			 FROM soul_shards ss
			 JOIN shard_souls sr ON sr.shard_id = ss.id
			 WHERE ss.status = 'pending' AND ss.sealed = 0
			 GROUP BY sr.soul_id`,
		)
		.all<ShardCountRecord>();
}
