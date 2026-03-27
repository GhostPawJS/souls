import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from './add_trait.ts';
import { countActiveTraits } from './count_active_traits.ts';
import { revertTrait } from './revert_trait.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('countActiveTraits', () => {
	it('returns 0 for a soul with no traits', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		strictEqual(countActiveTraits(db, soul.id), 0);
	});

	it('counts only active traits', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		addTrait(db, soul.id, { principle: 'P2', provenance: 'E.' });
		revertTrait(db, t1.id);
		strictEqual(countActiveTraits(db, soul.id), 1);
	});
});
