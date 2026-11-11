import type { SoulsDb } from '../database.ts';
import { mapShardRow } from './map_shard_row.ts';
import type { SearchShardsOptions, ShardRecord, ShardRow } from './types.ts';

const MS_PER_DAY = 86_400_000;

function searchShardsQuery(
	db: SoulsDb,
	query: string,
	options?: SearchShardsOptions,
	count = false,
): ShardRecord[] | number {
	if (!query.trim()) return count ? 0 : [];

	const params: (string | number)[] = [query];
	const conditions: string[] = [];

	const status = options?.status ?? 'all';
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

	if (options?.shardExpiryDays !== undefined) {
		const now = options.now ?? Date.now();
		const cutoff = now - options.shardExpiryDays * MS_PER_DAY;
		conditions.push(`ss.created_at > ?`);
		params.push(cutoff);
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
	const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

	const limit = Math.min(1000, Math.max(0, Math.trunc(options?.limit ?? 100)));
	const limitClause = `LIMIT ${limit} OFFSET ${Math.max(0, Math.trunc(options?.offset ?? 0))}`;

	const sql = `
		SELECT ss.*
		FROM soul_shards ss
		WHERE ss.id IN (SELECT rowid FROM shard_fts WHERE shard_fts MATCH ?)
		  ${whereClause}
		ORDER BY ss.created_at DESC
		${limitClause}
	`;

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

export function searchShards(
	db: SoulsDb,
	query: string,
	options?: SearchShardsOptions,
): ShardRecord[] {
	return searchShardsQuery(db, query, options) as ShardRecord[];
}
export function searchShardsPage(
	db: SoulsDb,
	query: string,
	options?: SearchShardsOptions,
): import('./types.ts').ShardPage {
	const items = searchShards(db, query, options);
	const total = searchShardsQuery(db, query, options, true) as number;
	return { items, total, hasMore: (options?.offset ?? 0) + items.length < total };
}
