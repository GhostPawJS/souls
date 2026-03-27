import type { SoulsDb } from '../database.ts';
import type { TagCountRecord } from './types.ts';

export function shardCountsByTag(db: SoulsDb, soulId?: number): TagCountRecord[] {
	if (soulId !== undefined) {
		return db
			.prepare(
				`SELECT st.tag, COUNT(DISTINCT st.shard_id) AS count
				 FROM shard_tags st
				 JOIN shard_souls sr ON sr.shard_id = st.shard_id
				 JOIN soul_shards ss ON ss.id = st.shard_id
				 WHERE sr.soul_id = ? AND ss.status = 'pending'
				 GROUP BY st.tag
				 ORDER BY count DESC`,
			)
			.all<TagCountRecord>(soulId);
	}

	return db
		.prepare(
			`SELECT st.tag, COUNT(DISTINCT st.shard_id) AS count
			 FROM shard_tags st
			 JOIN soul_shards ss ON ss.id = st.shard_id
			 WHERE ss.status = 'pending'
			 GROUP BY st.tag
			 ORDER BY count DESC`,
		)
		.all<TagCountRecord>();
}
