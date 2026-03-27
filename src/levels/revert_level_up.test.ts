import { strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { addTrait } from '../traits/add_trait.ts';
import { getTrait } from '../traits/get_trait.ts';
import { getLevelHistory } from './get_level_history.ts';
import { levelUp } from './level_up.ts';
import { revertLevelUp } from './revert_level_up.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('revertLevelUp', () => {
	it('restores previous essence and level', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'Old.', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });

		levelUp(db, soul.id, {
			newEssence: 'New.',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [t1.id],
		});

		revertLevelUp(db, soul.id);

		const restored = getSoulOrThrow(db, soul.id);
		strictEqual(restored.level, 1);
		strictEqual(restored.essence, 'Old.');
	});

	it('reactivates consolidated and promoted traits', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		const t2 = addTrait(db, soul.id, { principle: 'P2', provenance: 'E.' });

		levelUp(db, soul.id, {
			newEssence: 'New.',
			consolidations: [{ sourceTraitIds: [t1.id], mergedPrinciple: 'M', mergedProvenance: 'MP.' }],
			promotedTraitIds: [t2.id],
			carriedTraitIds: [],
		});

		revertLevelUp(db, soul.id);

		strictEqual(getTrait(db, t1.id)?.status, 'active');
		strictEqual(getTrait(db, t2.id)?.status, 'active');
	});

	it('removes the level snapshot', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		levelUp(db, soul.id, {
			newEssence: 'N.',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [t1.id],
		});
		revertLevelUp(db, soul.id);
		strictEqual(getLevelHistory(db, soul.id).length, 0);
	});

	it('throws if soul is at level 1', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		throws(() => revertLevelUp(db, soul.id), SoulsStateError);
	});
});
