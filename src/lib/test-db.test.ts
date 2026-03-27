import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from './test-db.ts';

describe('createInitializedSoulsDb', () => {
	it('returns a database with schema tables', async () => {
		const db = await createInitializedSoulsDb();
		const row = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='souls'")
			.get<{ name: string }>();
		strictEqual(row?.name, 'souls');
		db.close();
	});
});
