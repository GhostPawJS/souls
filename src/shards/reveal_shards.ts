import type { SoulsDb } from '../database.ts';
import { resolveNow } from '../resolve_now.ts';
import { mapShardRow } from './map_shard_row.ts';
import type { ShardRecord, ShardRow } from './types.ts';

export function revealShards(
	db: SoulsDb,
	shardIds: number[],
	options?: { now?: number },
): ShardRecord[] {
	if (shardIds.length === 0) return [];
	const now = resolveNow(options?.now);
	for (const id of shardIds) {
		db.prepare(`UPDATE soul_shards SET sealed = 0, updated_at = ? WHERE id = ?`).run(now, id);
	}
	const placeholders = shardIds.map(() => '?').join(', ');
	return db
		.prepare(`SELECT * FROM soul_shards WHERE id IN (${placeholders})`)
		.all<ShardRow>(...shardIds)
		.map((row) => mapShardRow(db, row));
}
