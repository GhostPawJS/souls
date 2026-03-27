import type { SoulsDb } from '../database.ts';
import { mapShardRow } from './map_shard_row.ts';
import type { ShardListOptions, ShardRecord, ShardRow } from './types.ts';

const MS_PER_DAY = 86_400_000;

export function listShards(db: SoulsDb, options?: ShardListOptions): ShardRecord[] {
	const conditions: string[] = [`ss.status = 'pending'`, `ss.sealed = 0`];
	const params: (string | number)[] = [];

	if (options?.soulId !== undefined) {
		conditions.push(
			`EXISTS (SELECT 1 FROM shard_souls sr WHERE sr.shard_id = ss.id AND sr.soul_id = ?)`,
		);
		params.push(options.soulId);
	}

	if (options?.source !== undefined) {
		conditions.push(`ss.source = ?`);
		params.push(options.source);
	}

	if (options?.tags !== undefined && options.tags.length > 0) {
		for (const tag of options.tags) {
			conditions.push(
				`EXISTS (SELECT 1 FROM shard_tags st WHERE st.shard_id = ss.id AND st.tag = ?)`,
			);
			params.push(tag);
		}
	}

	if (options?.shardExpiryDays !== undefined) {
		const now = options.now ?? Date.now();
		const cutoff = now - options.shardExpiryDays * MS_PER_DAY;
		conditions.push(`ss.created_at > ?`);
		params.push(cutoff);
	}

	const limit = options?.limit;
	const limitClause = limit !== undefined ? `LIMIT ${limit}` : '';

	const sql = `SELECT ss.* FROM soul_shards ss WHERE ${conditions.join(' AND ')} ORDER BY ss.created_at DESC ${limitClause}`;
	return db
		.prepare(sql)
		.all<ShardRow>(...params)
		.map((row) => mapShardRow(db, row));
}
