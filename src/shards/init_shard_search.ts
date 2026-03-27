import type { SoulsDb } from '../database.ts';

export function initShardSearch(db: SoulsDb): void {
	db.exec(`
		CREATE VIRTUAL TABLE IF NOT EXISTS shard_fts USING fts5(
			content,
			content='soul_shards',
			content_rowid='id'
		)
	`);

	db.exec(`
		CREATE TRIGGER IF NOT EXISTS shard_fts_after_insert
		AFTER INSERT ON soul_shards BEGIN
			INSERT INTO shard_fts(rowid, content) VALUES (new.id, new.content);
		END
	`);

	db.exec(`
		CREATE TRIGGER IF NOT EXISTS shard_fts_after_update
		AFTER UPDATE ON soul_shards BEGIN
			INSERT INTO shard_fts(shard_fts, rowid, content) VALUES ('delete', old.id, old.content);
			INSERT INTO shard_fts(rowid, content) VALUES (new.id, new.content);
		END
	`);

	db.exec(`
		CREATE TRIGGER IF NOT EXISTS shard_fts_after_delete
		AFTER DELETE ON soul_shards BEGIN
			INSERT INTO shard_fts(shard_fts, rowid, content) VALUES ('delete', old.id, old.content);
		END
	`);
}
