import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from './lib/test-db.ts';

describe('initSoulsTables', () => {
	it('creates the souls_meta table with a schema version', async () => {
		const db = await createInitializedSoulsDb();
		const row = db
			.prepare("SELECT value FROM souls_meta WHERE key = 'schema_version'")
			.get<{ value: string }>();
		strictEqual(row?.value, '1');
	});

	it('is idempotent', async () => {
		const db = await createInitializedSoulsDb();
		const { initSoulsTables } = await import('./init_souls_tables.ts');
		initSoulsTables(db);
		const row = db
			.prepare("SELECT value FROM souls_meta WHERE key = 'schema_version'")
			.get<{ value: string }>();
		strictEqual(row?.value, '1');
	});
});
