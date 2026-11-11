import type { SoulsDb } from '../database.ts';
import { addColumns, createIndex, createTable } from '../lib/schema_ddl.ts';

export function initLevelTables(db: SoulsDb): void {
	createTable(
		db,
		'soul_levels',
		` id INTEGER PRIMARY KEY, soul_id INTEGER NOT NULL REFERENCES souls(id), level INTEGER NOT NULL CHECK(level >= 2), essence_before TEXT NOT NULL, essence_after TEXT NOT NULL, traits_consolidated TEXT NOT NULL DEFAULT '[]', traits_promoted TEXT NOT NULL DEFAULT '[]', traits_carried TEXT NOT NULL DEFAULT '[]', traits_merged TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL `,
	);

	createIndex(db, 'idx_soul_levels_soul_id', `soul_levels(soul_id)`);
	createIndex(db, 'idx_soul_levels_soul_level', `soul_levels(soul_id, level)`);
	addColumns(db, 'soul_levels', { faded_shard_ids: 'TEXT', state_before: 'TEXT' });
}
