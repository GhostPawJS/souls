import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from './add_trait.ts';
import { reviseTrait } from './revise_trait.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('reviseTrait', () => {
	it('updates principle', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'Old.', provenance: 'Evidence.' });
		const revised = reviseTrait(db, trait.id, { principle: 'New principle.' });
		strictEqual(revised.principle, 'New principle.');
	});

	it('updates provenance', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P.', provenance: 'Old evidence.' });
		const revised = reviseTrait(db, trait.id, { provenance: 'New evidence.' });
		strictEqual(revised.provenance, 'New evidence.');
	});
});
