import type { SoulsDb } from '../database.ts';
import { mapShardRow } from './map_shard_row.ts';
import type { ShardListOptions, ShardRecord, ShardRow } from './types.ts';

/** The list and FTS paths share filtering, ordering, pagination, and row hydration. */
export function queryShards(
	db: SoulsDb,
	options: ShardListOptions | undefined,
	defaultStatus: 'pending' | 'all',
	count: boolean,
	query?: string,
): ShardRecord[] | number {
	if (query !== undefined && !query.trim()) return count ? 0 : [];
	const conditions: string[] = [];
	const params: (string | number)[] = [];
	if (query !== undefined) {
		conditions.push('ss.id IN (SELECT rowid FROM shard_fts WHERE shard_fts MATCH ?)');
		params.push(query);
	}
	const status = options?.status ?? defaultStatus;
	if (status !== 'all') conditions.push('ss.withdrawn_at IS NULL');
	if (status === 'sealed') conditions.push('ss.sealed = 1');
	else if (status !== 'all') {
		conditions.push('ss.status = ?');
		params.push(status);
		if (status === 'pending') conditions.push('ss.sealed = 0');
	}
	if (options?.soulId !== undefined) {
		conditions.push(
			'EXISTS (SELECT 1 FROM shard_souls sr WHERE sr.shard_id = ss.id AND sr.soul_id = ?)',
		);
		params.push(options.soulId);
	}
	if (options?.source !== undefined) {
		conditions.push('ss.source = ?');
		params.push(options.source);
	}
	for (const tag of options?.tags ?? []) {
		conditions.push(
			'EXISTS (SELECT 1 FROM shard_tags st WHERE st.shard_id = ss.id AND st.tag = ?)',
		);
		params.push(tag);
	}
	if (options?.shardExpiryDays !== undefined) {
		conditions.push('ss.created_at > ?');
		params.push((options.now ?? Date.now()) - options.shardExpiryDays * 86400000);
	}
	const from = `FROM soul_shards ss WHERE ${conditions.length ? conditions.join(' AND ') : '1 = 1'}`;
	if (count)
		return (
			db.prepare(`SELECT COUNT(*) AS total ${from}`).get<{ total: number }>(...params)?.total ?? 0
		);
	const limit = Math.min(1000, Math.max(0, Math.trunc(options?.limit ?? 100)));
	return db
		.prepare(
			`SELECT ss.* ${from} ORDER BY ss.created_at DESC LIMIT ${limit} OFFSET ${Math.max(0, Math.trunc(options?.offset ?? 0))}`,
		)
		.all<ShardRow>(...params)
		.map((row) => mapShardRow(db, row));
}

export function queryShardsPage(
	db: SoulsDb,
	options: ShardListOptions | undefined,
	defaultStatus: 'pending' | 'all',
	query?: string,
) {
	const items = queryShards(db, options, defaultStatus, false, query) as ShardRecord[];
	const total = queryShards(db, options, defaultStatus, true, query) as number;
	return { items, total, hasMore: (options?.offset ?? 0) + items.length < total };
}
