import type { SoulsDb } from '../database.ts';

export interface SourceCountRecord {
	source: string;
	count: number;
}

export function shardCountsBySource(db: SoulsDb, soulId?: number): SourceCountRecord[] {
	if (soulId !== undefined) {
		return db
			.prepare(
				`SELECT ss.source, COUNT(*) AS count
				 FROM soul_shards ss
				 JOIN shard_souls sr ON sr.shard_id = ss.id
				 WHERE sr.soul_id = ? AND ss.status = 'pending'
				 GROUP BY ss.source
				 ORDER BY count DESC`,
			)
			.all<SourceCountRecord>(soulId);
	}

	return db
		.prepare(
			`SELECT source, COUNT(*) AS count
			 FROM soul_shards
			 WHERE status = 'pending'
			 GROUP BY source
			 ORDER BY count DESC`,
		)
		.all<SourceCountRecord>();
}
