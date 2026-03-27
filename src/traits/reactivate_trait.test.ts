import { strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from './add_trait.ts';
import { reactivateTrait } from './reactivate_trait.ts';
import { revertTrait } from './revert_trait.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('reactivateTrait', () => {
	it('restores a reverted trait to active', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P.', provenance: 'Evidence.' });
		revertTrait(db, trait.id);
		const reactivated = reactivateTrait(db, trait.id);
		strictEqual(reactivated.status, 'active');
	});

	it('throws if already active', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P.', provenance: 'Evidence.' });
		throws(() => reactivateTrait(db, trait.id), SoulsStateError);
	});
});
