import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { validateLevelUpPlan } from './validate_level_up_plan.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('validateLevelUpPlan', () => {
	it('returns valid when all traits accounted for', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		const t2 = addTrait(db, soul.id, { principle: 'P2', provenance: 'E.' });

		const result = validateLevelUpPlan(db, soul.id, {
			newEssence: 'New.',
			consolidations: [{ sourceTraitIds: [t1.id], mergedPrinciple: 'M', mergedProvenance: 'MP.' }],
			promotedTraitIds: [],
			carriedTraitIds: [t2.id],
		});
		strictEqual(result.valid, true);
	});

	it('returns invalid when a trait is missing', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		addTrait(db, soul.id, { principle: 'P2', provenance: 'E.' });

		const result = validateLevelUpPlan(db, soul.id, {
			newEssence: 'New.',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [],
		});
		strictEqual(result.valid, false);
	});
});
