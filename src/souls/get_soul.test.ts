import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from './create_soul.ts';
import { getSoul } from './get_soul.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('getSoul', () => {
	it('returns the soul by id', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const found = getSoul(db, soul.id);
		ok(found);
		strictEqual(found.name, 'Aria');
	});

	it('returns undefined for unknown id', () => {
		const found = getSoul(db, 9999);
		strictEqual(found, undefined);
	});
});
