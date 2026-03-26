import { ok } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { openTestDatabase } from './open-test-database.ts';

describe('openTestDatabase', () => {
	it('returns a database instance with exec', async () => {
		const db = await openTestDatabase();
		ok(typeof db.exec === 'function');
		db.close();
	});

	it('returns a database instance with prepare', async () => {
		const db = await openTestDatabase();
		ok(typeof db.prepare === 'function');
		db.close();
	});
});
