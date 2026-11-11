import type { SoulsDb } from '../database.ts';
import { mapShardRow } from './map_shard_row.ts';
import type { ShardListOptions, ShardRecord, ShardRow } from './types.ts';

const MS_PER_DAY = 86_400_000;

function listShardsQuery(
	db: SoulsDb,
	options?: ShardListOptions,
	count = false,
): ShardRecord[] | number {
	const conditions: string[] = [];
	const params: (string | number)[] = [];

	const status = options?.status ?? 'pending';
	if (status !== 'all') conditions.push('ss.withdrawn_at IS NULL');
	if (status === 'sealed') conditions.push('ss.sealed = 1');
	else if (status !== 'all') {
		conditions.push('ss.status = ?');
		params.push(status);
		if (status === 'pending') conditions.push('ss.sealed = 0');
	}

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

	const limit = Math.min(1000, Math.max(0, Math.trunc(options?.limit ?? 100)));
	const limitClause = `LIMIT ${limit} OFFSET ${Math.max(0, Math.trunc(options?.offset ?? 0))}`;

	const sql = `SELECT ss.* FROM soul_shards ss WHERE ${conditions.length ? conditions.join(' AND ') : '1 = 1'} ORDER BY ss.created_at DESC ${limitClause}`;
	if (count)
		return (
			db
				.prepare(`SELECT COUNT(*) AS total FROM (${sql.replace(limitClause, '')})`)
				.get<{ total: number }>(...params)?.total ?? 0
		);
	return db
		.prepare(sql)
		.all<ShardRow>(...params)
		.map((row) => mapShardRow(db, row));
}

export function listShards(db: SoulsDb, options?: ShardListOptions): ShardRecord[] {
	return listShardsQuery(db, options) as ShardRecord[];
}
export function listShardsPage(
	db: SoulsDb,
	options?: ShardListOptions,
): import('./types.ts').ShardPage {
	const items = listShards(db, options);
	const total = listShardsQuery(db, options, true) as number;
	return { items, total, hasMore: (options?.offset ?? 0) + items.length < total };
}
