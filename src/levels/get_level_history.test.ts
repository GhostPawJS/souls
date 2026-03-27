import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { getLevelHistory } from './get_level_history.ts';
import { levelUp } from './level_up.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('getLevelHistory', () => {
	it('returns empty for a level-1 soul', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		strictEqual(getLevelHistory(db, soul.id).length, 0);
	});

	it('returns one record after a level-up', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });

		levelUp(db, soul.id, {
			newEssence: 'New.',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [t1.id],
		});

		const history = getLevelHistory(db, soul.id);
		strictEqual(history.length, 1);
		strictEqual(history[0]?.level, 2);
	});
});
