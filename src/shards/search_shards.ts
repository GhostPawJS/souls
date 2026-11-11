import type { SoulsDb } from '../database.ts';
import { queryShards, queryShardsPage } from './query_shards.ts';
import type { SearchShardsOptions, ShardRecord } from './types.ts';

export function searchShards(
	db: SoulsDb,
	query: string,
	options?: SearchShardsOptions,
): ShardRecord[] {
	return queryShards(db, options, 'all', false, query) as ShardRecord[];
}
export function searchShardsPage(
	db: SoulsDb,
	query: string,
	options?: SearchShardsOptions,
): import('./types.ts').ShardPage {
	return queryShardsPage(db, options, 'all', query);
}
