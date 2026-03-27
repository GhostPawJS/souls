import { ok, strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from './add_trait.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('addTrait', () => {
	it('adds an active trait to a soul', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, {
			principle: 'Think carefully before acting.',
			provenance: 'Observed in 3 delegation sessions.',
		});
		ok(trait.id > 0);
		strictEqual(trait.soulId, soul.id);
		strictEqual(trait.status, 'active');
		strictEqual(trait.generation, 1);
	});

	it('throws when at the trait limit', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		for (let i = 0; i < 3; i++) {
			addTrait(db, soul.id, { principle: `Principle ${i}`, provenance: 'Evidence.' });
		}
		throws(
			() =>
				addTrait(
					db,
					soul.id,
					{ principle: 'One more.', provenance: 'Evidence.' },
					{ traitLimit: 3 },
				),
			SoulsStateError,
		);
	});
});
