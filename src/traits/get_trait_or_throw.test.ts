import { ok, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsNotFoundError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from './add_trait.ts';
import { getTraitOrThrow } from './get_trait_or_throw.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('getTraitOrThrow', () => {
	it('returns trait', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P.', provenance: 'Evidence.' });
		ok(getTraitOrThrow(db, trait.id));
	});

	it('throws for unknown id', () => {
		throws(() => getTraitOrThrow(db, 9999), SoulsNotFoundError);
	});
});
