import { strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from './add_trait.ts';
import { revertTrait } from './revert_trait.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('revertTrait', () => {
	it('sets status to reverted', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P.', provenance: 'Evidence.' });
		const reverted = revertTrait(db, trait.id);
		strictEqual(reverted.status, 'reverted');
	});

	it('throws if trait is not active', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P.', provenance: 'Evidence.' });
		revertTrait(db, trait.id);
		throws(() => revertTrait(db, trait.id), SoulsStateError);
	});
});
