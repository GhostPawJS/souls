import { ok, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SoulsValidationError } from '../errors.ts';
import { levelUp } from '../levels/level_up.ts';
import { revertLevelUp } from '../levels/revert_level_up.ts';
import { validateLevelUpPlan } from '../levels/validate_level_up_plan.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { getSoul } from '../souls/get_soul.ts';
import { getSoulProfile } from '../souls/get_soul_profile.ts';
import { stampAttuned } from '../souls/stamp_attuned.ts';
import { addTrait } from '../traits/add_trait.ts';
import { listTraits } from '../traits/list_traits.ts';
import { executeLevelUpPlanSkill } from './execute-level-up-plan.ts';

describe('execute-level-up-plan workflow', () => {
	it('skill definition has valid shape and content', () => {
		strictEqual(executeLevelUpPlanSkill.name, 'execute-level-up-plan');
		ok(executeLevelUpPlanSkill.content.includes('# Execute Level-Up Plan'));
		ok(executeLevelUpPlanSkill.content.includes('level_up_soul'));
		ok(executeLevelUpPlanSkill.content.includes('inspect_souls_item'));
		ok(executeLevelUpPlanSkill.content.includes('stamp_attuned'));
	});

	it('full workflow: validate → execute → verify → stamp', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Evolver',
			essence: 'A soul ready for its first level-up.',
			description: 'Test.',
			now,
		});
		const t1 = addTrait(db, soul.id, { principle: 'Be concise.', provenance: 'P1', now });
		const t2 = addTrait(db, soul.id, { principle: 'Cite sources.', provenance: 'P2', now });
		const t3 = addTrait(db, soul.id, { principle: 'Preserve specificity.', provenance: 'P3', now });

		const plan = {
			newEssence: 'A refined soul that is concise, evidence-based, and preserves specificity.',
			consolidations: [
				{
					sourceTraitIds: [t1.id, t2.id],
					mergedPrinciple: 'Cite sources concisely.',
					mergedProvenance: 'Consolidated from "Be concise" and "Cite sources".',
				},
			],
			promotedTraitIds: [],
			carriedTraitIds: [t3.id],
		};

		const validation = validateLevelUpPlan(db, soul.id, plan);
		ok(validation.valid);

		const result = levelUp(db, soul.id, plan, { now });
		strictEqual(result.level, 2);

		const profile = getSoulProfile(db, soul.id, { now });
		strictEqual(profile.soul.level, 2);
		strictEqual(profile.soul.essence, plan.newEssence);
		// t1 and t2 are consolidated, t3 is carried, plus one merged trait
		const activeTraits = listTraits(db, soul.id, { status: 'active' });
		strictEqual(activeTraits.length, 2);

		const stamped = stampAttuned(db, soul.id, { now });
		ok(stamped.lastAttunedAt);
	});

	it('validation catches missing traits', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'MissingTraits',
			essence: 'Soul with missing traits in plan.',
			description: 'Test.',
		});
		const t1 = addTrait(db, soul.id, { principle: 'Trait A.', provenance: 'PA' });
		addTrait(db, soul.id, { principle: 'Trait B.', provenance: 'PB' });

		const badPlan = {
			newEssence: 'New essence.',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [t1.id],
		};

		const result = validateLevelUpPlan(db, soul.id, badPlan);
		ok(!result.valid);
		ok(result.error.missingTraitIds.length > 0);
	});

	it('validation catches duplicate trait IDs', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'DupTraits',
			essence: 'Soul with duplicate plan entries.',
			description: 'Test.',
		});
		const t1 = addTrait(db, soul.id, { principle: 'Trait X.', provenance: 'PX' });

		const badPlan = {
			newEssence: 'New essence.',
			consolidations: [],
			promotedTraitIds: [t1.id],
			carriedTraitIds: [t1.id],
		};

		const result = validateLevelUpPlan(db, soul.id, badPlan);
		ok(!result.valid);
		ok(result.error.duplicateTraitIds.length > 0);
	});

	it('validation catches invalid (non-active) trait IDs', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'InvalidTraits',
			essence: 'Soul with bad IDs.',
			description: 'Test.',
		});
		const t1 = addTrait(db, soul.id, { principle: 'Active.', provenance: 'PA' });

		const badPlan = {
			newEssence: 'New essence.',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [t1.id, 9999],
		};

		const result = validateLevelUpPlan(db, soul.id, badPlan);
		ok(!result.valid);
		ok(result.error.invalidTraitIds.includes(9999));
	});

	it('rejects plan with empty newEssence', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'EmptyEssence',
			essence: 'Valid current essence.',
			description: 'Test.',
		});
		addTrait(db, soul.id, { principle: 'P.', provenance: 'Prov.' });

		throws(
			() =>
				validateLevelUpPlan(db, soul.id, {
					newEssence: '',
					consolidations: [],
					promotedTraitIds: [],
					carriedTraitIds: [],
				}),
			SoulsValidationError,
		);
	});

	it('revert after bad level-up restores previous state', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Revertable',
			essence: 'Good original essence.',
			description: 'Test.',
			now,
		});
		const t1 = addTrait(db, soul.id, { principle: 'Solid trait.', provenance: 'P1', now });

		levelUp(
			db,
			soul.id,
			{
				newEssence: 'Bad new essence that regressed behavior.',
				consolidations: [],
				promotedTraitIds: [t1.id],
				carriedTraitIds: [],
			},
			{ now },
		);

		strictEqual(getSoul(db, soul.id)!.level, 2);

		revertLevelUp(db, soul.id, { now });

		const reverted = getSoul(db, soul.id);
		strictEqual(reverted!.level, 1);
		strictEqual(reverted!.essence, 'Good original essence.');
		const traits = listTraits(db, soul.id, { status: 'active' });
		strictEqual(traits.length, 1);
	});
});
