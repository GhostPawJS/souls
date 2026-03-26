import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from './database.ts';
import { getSchemaVersion } from './get_schema_version.ts';
import { createInitializedSoulsDb } from './lib/test-db.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('getSchemaVersion', () => {
	it('returns the initial schema version', () => {
		strictEqual(getSchemaVersion(db), '1');
	});

	it('returns the updated version after a manual change', () => {
		db.prepare("UPDATE souls_meta SET value = '42' WHERE key = 'schema_version'").run();
		strictEqual(getSchemaVersion(db), '42');
	});
});
