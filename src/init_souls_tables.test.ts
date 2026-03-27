import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from './lib/test-db.ts';

describe('initSoulsTables', () => {
	it('creates all entity tables', async () => {
		const db = await createInitializedSoulsDb();
		for (const tableName of ['souls', 'soul_traits', 'soul_levels', 'soul_shards']) {
			const row = db
				.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
				.get<{ name: string }>(tableName);
			strictEqual(row?.name, tableName);
		}
	});

	it('is idempotent', async () => {
		const db = await createInitializedSoulsDb();
		const { initSoulsTables } = await import('./init_souls_tables.ts');
		initSoulsTables(db);
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='souls'`)
			.get<{ name: string }>();
		strictEqual(row?.name, 'souls');
	});
});
