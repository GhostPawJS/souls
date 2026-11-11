import type { SoulsDb } from '../database.ts';
import { addColumns, createIndex, createTable } from '../lib/schema_ddl.ts';

export function initShardTables(db: SoulsDb): void {
	createTable(
		db,
		'soul_shards',
		` id INTEGER PRIMARY KEY, content TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'faded')), sealed INTEGER NOT NULL DEFAULT 0 CHECK(sealed IN (0, 1)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, CHECK(length(trim(content)) > 0), CHECK(length(trim(source)) > 0) `,
	);

	createTable(
		db,
		'shard_souls',
		` shard_id INTEGER NOT NULL REFERENCES soul_shards(id), soul_id INTEGER NOT NULL REFERENCES souls(id), PRIMARY KEY (shard_id, soul_id) `,
	);

	createTable(
		db,
		'shard_citations',
		` shard_id INTEGER NOT NULL REFERENCES soul_shards(id), trait_id INTEGER NOT NULL REFERENCES soul_traits(id), PRIMARY KEY (shard_id, trait_id) `,
	);

	createTable(
		db,
		'shard_tags',
		` shard_id INTEGER NOT NULL REFERENCES soul_shards(id), tag TEXT NOT NULL, PRIMARY KEY (shard_id, tag) `,
	);

	createIndex(
		db,
		'idx_shards_pending',
		`soul_shards(status, sealed, created_at) WHERE status = 'pending'`,
	);
	createIndex(db, 'idx_shard_souls_soul', `shard_souls(soul_id)`);
	createIndex(db, 'idx_shard_citations_shard', `shard_citations(shard_id)`);
	createIndex(db, 'idx_shard_citations_trait', `shard_citations(trait_id)`);
	createIndex(db, 'idx_shard_tags_shard', `shard_tags(shard_id)`);
	createIndex(db, 'idx_shard_tags_tag', `shard_tags(tag)`);
	addColumns(db, 'shard_citations', { created_at: 'INTEGER' });
	addColumns(db, 'soul_shards', {
		withdrawn_at: 'INTEGER',
		withdrawal_reason: 'TEXT',
		superseded_by: 'INTEGER REFERENCES soul_shards(id)',
		occurred_at: 'INTEGER',
		inserted_at: 'INTEGER',
		idempotency_key: 'TEXT',
		ref: 'TEXT',
	});

	db.exec(
		'CREATE UNIQUE INDEX IF NOT EXISTS idx_shard_idempotency ON soul_shards(idempotency_key) WHERE idempotency_key IS NOT NULL',
	);
}
