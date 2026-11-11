import type { SoulsDb } from '../database.ts';
import { createIndex, createTable } from '../lib/schema_ddl.ts';

export function initTraitTables(db: SoulsDb): void {
	createTable(
		db,
		'soul_traits',
		` id INTEGER PRIMARY KEY, soul_id INTEGER NOT NULL REFERENCES souls(id), principle TEXT NOT NULL, provenance TEXT NOT NULL, generation INTEGER NOT NULL CHECK(generation >= 1), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'consolidated', 'promoted', 'reverted')), merged_into INTEGER REFERENCES soul_traits(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, CHECK(length(trim(principle)) > 0), CHECK(length(trim(provenance)) > 0) `,
	);

	createIndex(db, 'idx_soul_traits_soul_id', `soul_traits(soul_id)`);
	createIndex(db, 'idx_soul_traits_status', `soul_traits(soul_id, status)`);
	createIndex(
		db,
		'idx_soul_traits_merged_into',
		`soul_traits(merged_into) WHERE merged_into IS NOT NULL`,
	);
}
