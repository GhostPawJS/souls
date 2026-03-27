import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';

describe('initShardTables', () => {
	it('creates all shard tables', async () => {
		const db = await createInitializedSoulsDb();
		for (const tableName of ['soul_shards', 'shard_souls', 'shard_citations', 'shard_tags']) {
			const row = db
				.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
				.get<{ name: string }>(tableName);
			strictEqual(row?.name, tableName);
		}
	});
});
