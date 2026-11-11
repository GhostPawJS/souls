import type { SoulsDb } from '../database.ts';
import { queryShards, queryShardsPage } from './query_shards.ts';
import type { ShardListOptions, ShardRecord } from './types.ts';

export function listShards(db: SoulsDb, options?: ShardListOptions): ShardRecord[] {
	return queryShards(db, options, 'pending', false) as ShardRecord[];
}
export function listShardsPage(
	db: SoulsDb,
	options?: ShardListOptions,
): import('./types.ts').ShardPage {
	return queryShardsPage(db, options, 'pending');
}
