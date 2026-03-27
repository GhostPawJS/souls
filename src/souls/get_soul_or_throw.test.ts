import { ok, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsNotFoundError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from './create_soul.ts';
import { getSoulOrThrow } from './get_soul_or_throw.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('getSoulOrThrow', () => {
	it('returns the soul', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const found = getSoulOrThrow(db, soul.id);
		ok(found);
	});

	it('throws SoulsNotFoundError for unknown id', () => {
		throws(() => getSoulOrThrow(db, 9999), SoulsNotFoundError);
	});
});
