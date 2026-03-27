import { ok, strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from './create_soul.ts';
import { retireSoul } from './retire_soul.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('retireSoul', () => {
	it('sets deletedAt and isDormant', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const retired = retireSoul(db, soul.id);
		ok(retired.deletedAt !== null);
		strictEqual(retired.isDormant, true);
	});

	it('throws if already dormant', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		retireSoul(db, soul.id);
		throws(() => retireSoul(db, soul.id), SoulsStateError);
	});
});
