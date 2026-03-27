import type { SoulsDb } from '../database.ts';

export function initShardTables(db: SoulsDb): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS soul_shards (
			id         INTEGER PRIMARY KEY,
			content    TEXT NOT NULL,
			source     TEXT NOT NULL,
			status     TEXT NOT NULL DEFAULT 'pending'
			           CHECK(status IN ('pending', 'faded')),
			sealed     INTEGER NOT NULL DEFAULT 0 CHECK(sealed IN (0, 1)),
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL,
			CHECK(length(trim(content)) > 0),
			CHECK(length(trim(source)) > 0)
		) STRICT
	`);

	db.exec(`
		CREATE TABLE IF NOT EXISTS shard_souls (
			shard_id INTEGER NOT NULL REFERENCES soul_shards(id),
			soul_id  INTEGER NOT NULL REFERENCES souls(id),
			PRIMARY KEY (shard_id, soul_id)
		) STRICT
	`);

	db.exec(`
		CREATE TABLE IF NOT EXISTS shard_citations (
			shard_id INTEGER NOT NULL REFERENCES soul_shards(id),
			trait_id INTEGER NOT NULL REFERENCES soul_traits(id),
			PRIMARY KEY (shard_id, trait_id)
		) STRICT
	`);

	db.exec(`
		CREATE TABLE IF NOT EXISTS shard_tags (
			shard_id INTEGER NOT NULL REFERENCES soul_shards(id),
			tag      TEXT NOT NULL,
			PRIMARY KEY (shard_id, tag)
		) STRICT
	`);

	db.exec(
		`CREATE INDEX IF NOT EXISTS idx_shards_pending ON soul_shards(status, sealed, created_at) WHERE status = 'pending'`,
	);
	db.exec(`CREATE INDEX IF NOT EXISTS idx_shard_souls_soul ON shard_souls(soul_id)`);
	db.exec(`CREATE INDEX IF NOT EXISTS idx_shard_citations_shard ON shard_citations(shard_id)`);
	db.exec(`CREATE INDEX IF NOT EXISTS idx_shard_citations_trait ON shard_citations(trait_id)`);
	db.exec(`CREATE INDEX IF NOT EXISTS idx_shard_tags_shard ON shard_tags(shard_id)`);
	db.exec(`CREATE INDEX IF NOT EXISTS idx_shard_tags_tag ON shard_tags(tag)`);
}
