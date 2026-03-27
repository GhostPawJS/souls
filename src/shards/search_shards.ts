import type { SoulsDb } from '../database.ts';
import { mapShardRow } from './map_shard_row.ts';
import type { SearchShardsOptions, ShardRecord, ShardRow } from './types.ts';

const MS_PER_DAY = 86_400_000;

export function searchShards(
	db: SoulsDb,
	query: string,
	options?: SearchShardsOptions,
): ShardRecord[] {
	if (!query.trim()) return [];

	const params: (string | number)[] = [query];
	const conditions: string[] = [];

	if (options?.soulId !== undefined) {
		conditions.push(
			`EXISTS (SELECT 1 FROM shard_souls sr WHERE sr.shard_id = ss.id AND sr.soul_id = ?)`,
		);
		params.push(options.soulId);
	}

	if (options?.shardExpiryDays !== undefined) {
		const now = options.now ?? Date.now();
		const cutoff = now - options.shardExpiryDays * MS_PER_DAY;
		conditions.push(`ss.created_at > ?`);
		params.push(cutoff);
	}

	const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

	const limit = options?.limit;
	const limitClause = limit !== undefined ? `LIMIT ${limit}` : '';

	const sql = `
		SELECT ss.*
		FROM soul_shards ss
		WHERE ss.id IN (SELECT rowid FROM shard_fts WHERE shard_fts MATCH ?)
		  ${whereClause}
		ORDER BY ss.created_at DESC
		${limitClause}
	`;

	return db
		.prepare(sql)
		.all<ShardRow>(...params)
		.map((row) => mapShardRow(db, row));
}
