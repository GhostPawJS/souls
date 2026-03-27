import type { SoulsDb } from '../database.ts';
import type { CrossSoulOverlap, EvidenceCluster } from './types.ts';

/**
 * For each cluster, find souls other than the target that share shards in the cluster.
 * Returns a parallel array of overlap arrays — one per cluster.
 */
export function computeCrossSoulOverlap(
	db: SoulsDb,
	targetSoulId: number,
	clusters: EvidenceCluster[],
): CrossSoulOverlap[][] {
	return clusters.map((cluster) => {
		if (cluster.members.length === 0) return [];

		const shardIds = cluster.members.map((s) => s.id);
		const placeholders = shardIds.map(() => '?').join(', ');

		const rows = db
			.prepare(
				`SELECT soul_id AS soulId, COUNT(*) AS shardCount
				 FROM shard_souls
				 WHERE shard_id IN (${placeholders})
				   AND soul_id != ?
				 GROUP BY soul_id`,
			)
			.all<{ soulId: number; shardCount: number }>(...shardIds, targetSoulId);

		return rows.map((r) => ({ soulId: r.soulId, shardCount: r.shardCount }));
	});
}
