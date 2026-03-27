import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';

describe('initLevelTables', () => {
	it('creates the soul_levels table', async () => {
		const db = await createInitializedSoulsDb();
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='soul_levels'`)
			.get<{ name: string }>();
		strictEqual(row?.name, 'soul_levels');
	});
});
