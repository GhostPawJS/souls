import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from './add_trait.ts';
import { getTrait } from './get_trait.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('getTrait', () => {
	it('returns trait by id', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P.', provenance: 'Evidence.' });
		const found = getTrait(db, trait.id);
		ok(found);
		strictEqual(found.principle, 'P.');
	});

	it('returns undefined for unknown id', () => {
		strictEqual(getTrait(db, 9999), undefined);
	});
});
