import { strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { addTrait } from '../traits/add_trait.ts';
import { getTrait } from '../traits/get_trait.ts';
import { listTraits } from '../traits/list_traits.ts';
import { levelUp } from './level_up.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('levelUp', () => {
	it('increments soul level and replaces essence', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'Old.', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });

		levelUp(db, soul.id, {
			newEssence: 'New essence.',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [t1.id],
		});

		const updated = getSoulOrThrow(db, soul.id);
		strictEqual(updated.level, 2);
		strictEqual(updated.essence, 'New essence.');
	});

	it('marks consolidated traits and creates merged trait', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		const t2 = addTrait(db, soul.id, { principle: 'P2', provenance: 'E.' });

		const result = levelUp(db, soul.id, {
			newEssence: 'New.',
			consolidations: [
				{
					sourceTraitIds: [t1.id, t2.id],
					mergedPrinciple: 'Merged.',
					mergedProvenance: 'Combined.',
				},
			],
			promotedTraitIds: [],
			carriedTraitIds: [],
		});

		strictEqual(getTrait(db, t1.id)?.status, 'consolidated');
		strictEqual(getTrait(db, t2.id)?.status, 'consolidated');
		const active = listTraits(db, soul.id, { status: 'active' });
		strictEqual(active.length, 1);
		strictEqual(active[0]?.principle, 'Merged.');
		strictEqual(result.level, 2);
	});

	it('marks promoted traits', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });

		levelUp(db, soul.id, {
			newEssence: 'New.',
			consolidations: [],
			promotedTraitIds: [t1.id],
			carriedTraitIds: [],
		});

		strictEqual(getTrait(db, t1.id)?.status, 'promoted');
	});

	it('throws on invalid plan', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });

		throws(
			() =>
				levelUp(db, soul.id, {
					newEssence: 'New.',
					consolidations: [],
					promotedTraitIds: [],
					carriedTraitIds: [],
				}),
			SoulsValidationError,
		);
	});
});
