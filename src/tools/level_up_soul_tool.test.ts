import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import type { LevelUpPlan } from '../levels/types.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { levelUpSoulToolHandler } from './level_up_soul_tool.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('levelUpSoulToolHandler', () => {
	it('validates a plan', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P', provenance: 'E.' });
		const plan: LevelUpPlan = {
			newEssence: 'New essence.',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [trait.id],
		};
		const result = levelUpSoulToolHandler(db, { action: 'validate', soulId: soul.id, plan });
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { valid: boolean };
			ok(data.valid);
		}
	});

	it('executes a valid plan', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P', provenance: 'E.' });
		const plan: LevelUpPlan = {
			newEssence: 'New essence.',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [trait.id],
		};
		const result = levelUpSoulToolHandler(db, { action: 'execute', soulId: soul.id, plan });
		ok(result.ok);
		if (result.ok) {
			const data = result.data as import('./level_up_soul_tool.ts').LevelUpSoulExecuteData;
			strictEqual(data.result.level, 2);
		}
	});
});
