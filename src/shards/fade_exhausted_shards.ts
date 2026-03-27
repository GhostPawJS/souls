import type { SoulsDb } from '../database.ts';
import { resolveNow } from '../resolve_now.ts';

export function fadeExhaustedShards(
	db: SoulsDb,
	options?: { fadeCitationThreshold?: number; now?: number },
): number {
	const threshold = options?.fadeCitationThreshold ?? 2;
	const now = resolveNow(options?.now);

	const result = db
		.prepare(
			`UPDATE soul_shards SET status = 'faded', updated_at = ?
			 WHERE status = 'pending'
			   AND id IN (
			     SELECT shard_id
			     FROM shard_citations
			     GROUP BY shard_id
			     HAVING COUNT(DISTINCT trait_id) >= ?
			   )`,
		)
		.run(now, threshold);

	return Number(result.changes);
}
