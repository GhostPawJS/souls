import { ok } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';

describe('initShardSearch', () => {
	it('creates the shard_fts virtual table', async () => {
		const db = await createInitializedSoulsDb();
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='shard_fts'`)
			.get<{ name: string }>();
		ok(row);
	});
});
