import type { SoulsDb } from './database.ts';
import { initLevelTables } from './levels/init_level_tables.ts';
import { initShardSearch } from './shards/init_shard_search.ts';
import { initShardTables } from './shards/init_shard_tables.ts';
import { initSoulTables } from './souls/init_soul_tables.ts';
import { initTraitTables } from './traits/init_trait_tables.ts';

export function initSoulsTables(db: SoulsDb): void {
	initSoulTables(db);
	initTraitTables(db);
	initLevelTables(db);
	initShardTables(db);
	initShardSearch(db);
}
