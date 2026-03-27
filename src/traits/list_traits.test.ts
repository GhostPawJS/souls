import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from './add_trait.ts';
import { listTraits } from './list_traits.ts';
import { revertTrait } from './revert_trait.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('listTraits', () => {
	it('lists all traits for a soul', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		addTrait(db, soul.id, { principle: 'P2', provenance: 'E.' });
		strictEqual(listTraits(db, soul.id).length, 2);
	});

	it('filters by status', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		addTrait(db, soul.id, { principle: 'P2', provenance: 'E.' });
		revertTrait(db, t1.id);

		const active = listTraits(db, soul.id, { status: 'active' });
		strictEqual(active.length, 1);
		strictEqual(active[0]?.principle, 'P2');
	});
});
