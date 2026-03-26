import { strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from './database.ts';
import { SoulsValidationError } from './errors.ts';
import { createInitializedSoulsDb } from './lib/test-db.ts';
import { setMeta } from './set_meta.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('setMeta', () => {
	it('inserts a new meta key', () => {
		setMeta(db, 'foo', 'bar');
		const row = db.prepare("SELECT value FROM souls_meta WHERE key = 'foo'").get<{
			value: string;
		}>();
		strictEqual(row?.value, 'bar');
	});

	it('upserts an existing meta key', () => {
		setMeta(db, 'foo', 'bar');
		setMeta(db, 'foo', 'baz');
		const row = db.prepare("SELECT value FROM souls_meta WHERE key = 'foo'").get<{
			value: string;
		}>();
		strictEqual(row?.value, 'baz');
	});

	it('throws on empty key', () => {
		throws(() => setMeta(db, '', 'value'), SoulsValidationError);
	});
});
