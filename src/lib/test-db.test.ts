import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from './test-db.ts';

describe('createInitializedSoulsDb', () => {
	it('returns a database with schema tables', async () => {
		const db = await createInitializedSoulsDb();
		const row = db
			.prepare("SELECT value FROM souls_meta WHERE key = 'schema_version'")
			.get<{ value: string }>();
		strictEqual(row?.value, '1');
		db.close();
	});
});
