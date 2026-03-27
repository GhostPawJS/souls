import type { SoulsDb } from '../database.ts';

const WINDOW_DAYS = 14;
const MS_PER_DAY = 86_400_000;

export function computeShardVelocity(db: SoulsDb, soulId: number, now = Date.now()): number {
	const recentWindow = now - WINDOW_DAYS * MS_PER_DAY;
	const previousWindow = recentWindow - WINDOW_DAYS * MS_PER_DAY;

	const countInWindow = (start: number, end: number): number => {
		const row = db
			.prepare(
				`SELECT COUNT(*) AS cnt
				 FROM soul_shards ss
				 JOIN shard_souls sr ON sr.shard_id = ss.id
				 WHERE sr.soul_id = ? AND ss.created_at >= ? AND ss.created_at < ?`,
			)
			.get<{ cnt: number }>(soulId, start, end);
		return row?.cnt ?? 0;
	};

	const recentCount = countInWindow(recentWindow, now);
	const previousCount = countInWindow(previousWindow, recentWindow);

	if (previousCount === 0) return recentCount > 0 ? 1 : 0;
	return (recentCount - previousCount) / previousCount;
}
