import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';

describe('initSoulTables', () => {
	it('creates the souls table', async () => {
		const db = await createInitializedSoulsDb();
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='souls'`)
			.get<{ name: string }>();
		strictEqual(row?.name, 'souls');
	});

	it('is idempotent', async () => {
		const db = await createInitializedSoulsDb();
		const { initSoulTables } = await import('./init_soul_tables.ts');
		initSoulTables(db);
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='souls'`)
			.get<{ name: string }>();
		strictEqual(row?.name, 'souls');
	});
});
