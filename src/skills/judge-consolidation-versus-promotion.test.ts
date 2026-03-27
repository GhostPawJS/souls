import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { levelUp } from '../levels/level_up.ts';
import { validateLevelUpPlan } from '../levels/validate_level_up_plan.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { formatEvidence } from '../shards/format_evidence.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { listTraits } from '../traits/list_traits.ts';
import { judgeConsolidationVersusPromotionSkill } from './judge-consolidation-versus-promotion.ts';

describe('judge-consolidation-versus-promotion workflow', () => {
	it('skill definition has valid shape and content', () => {
		strictEqual(
			judgeConsolidationVersusPromotionSkill.name,
			'judge-consolidation-versus-promotion',
		);
		ok(
			judgeConsolidationVersusPromotionSkill.content.includes(
				'# Judge Consolidation versus Promotion',
			),
		);
		ok(judgeConsolidationVersusPromotionSkill.content.includes('PROMOTE'));
		ok(judgeConsolidationVersusPromotionSkill.content.includes('CONSOLIDATE'));
		ok(judgeConsolidationVersusPromotionSkill.content.includes('CARRY'));
	});

	it('every active trait must appear exactly once in a valid plan', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Judge',
			essence: 'A soul approaching capacity.',
			description: 'Test.',
			now,
		});

		const t1 = addTrait(db, soul.id, { principle: 'Be concise.', provenance: 'P1', now });
		const t2 = addTrait(db, soul.id, { principle: 'Be brief.', provenance: 'P2', now });
		const t3 = addTrait(db, soul.id, {
			principle: 'Preserve evidence chains.',
			provenance: 'P3',
			now,
		});

		const plan = {
			newEssence: 'A concise, evidence-driven soul.',
			consolidations: [
				{
					sourceTraitIds: [t1.id, t2.id],
					mergedPrinciple: 'Express ideas concisely and briefly.',
					mergedProvenance: 'Consolidated from "Be concise" and "Be brief".',
				},
			],
			promotedTraitIds: [],
			carriedTraitIds: [t3.id],
		};

		const validation = validateLevelUpPlan(db, soul.id, plan);
		ok(validation.valid);

		const result = levelUp(db, soul.id, plan, { now });
		strictEqual(result.level, 2);
	});

	it('plan fails if a trait appears in multiple lists', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'DupJudge',
			essence: 'Duplicate disposition test.',
			description: 'Test.',
		});
		const t1 = addTrait(db, soul.id, { principle: 'Trait A.', provenance: 'PA' });
		const t2 = addTrait(db, soul.id, { principle: 'Trait B.', provenance: 'PB' });

		const plan = {
			newEssence: 'New.',
			consolidations: [
				{
					sourceTraitIds: [t1.id],
					mergedPrinciple: 'Merged.',
					mergedProvenance: 'Merged prov.',
				},
			],
			promotedTraitIds: [t1.id],
			carriedTraitIds: [t2.id],
		};

		const result = validateLevelUpPlan(db, soul.id, plan);
		ok(!result.valid);
		ok(result.error.duplicateTraitIds.includes(t1.id));
	});

	it('plan fails if any active trait is omitted', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'MissingJudge',
			essence: 'Missing trait test.',
			description: 'Test.',
		});
		const t1 = addTrait(db, soul.id, { principle: 'Trait 1.', provenance: 'P1' });
		const t2 = addTrait(db, soul.id, { principle: 'Trait 2.', provenance: 'P2' });
		const t3 = addTrait(db, soul.id, { principle: 'Trait 3.', provenance: 'P3' });

		const plan = {
			newEssence: 'New.',
			consolidations: [],
			promotedTraitIds: [t1.id],
			carriedTraitIds: [t2.id],
		};

		const result = validateLevelUpPlan(db, soul.id, plan);
		ok(!result.valid);
		ok(result.error.missingTraitIds.includes(t3.id));
	});

	it('evidence report provides trait signals for judgment', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Evidenced',
			essence: 'Soul with evidence for judgment.',
			description: 'Test.',
			now,
		});
		addTrait(db, soul.id, { principle: 'Cited trait.', provenance: 'Prov.', now });

		dropShard(db, {
			content: 'Observed: the cited trait is consistently followed.',
			source: 'session',
			soulIds: [soul.id],
			tags: ['consistency'],
			now,
		});
		dropShard(db, {
			content: 'Confirmed: cited trait produces positive outcome.',
			source: 'manual_review',
			soulIds: [soul.id],
			tags: ['quality'],
			now,
		});

		const report = formatEvidence(db, soul.id, { now });
		ok(report.traitSignals.length > 0);
		ok(report.pendingCount >= 2);
	});

	it('successful consolidation reduces active trait count', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Consolidator',
			essence: 'Consolidation target.',
			description: 'Test.',
			now,
		});
		const t1 = addTrait(db, soul.id, { principle: 'Speak clearly.', provenance: 'P1', now });
		const t2 = addTrait(db, soul.id, { principle: 'Communicate plainly.', provenance: 'P2', now });
		const t3 = addTrait(db, soul.id, { principle: 'Preserve context.', provenance: 'P3', now });
		const t4 = addTrait(db, soul.id, { principle: 'Track provenance.', provenance: 'P4', now });

		const beforeCount = listTraits(db, soul.id, { status: 'active' }).length;
		strictEqual(beforeCount, 4);

		levelUp(
			db,
			soul.id,
			{
				newEssence: 'A clear communicator that preserves context and provenance.',
				consolidations: [
					{
						sourceTraitIds: [t1.id, t2.id],
						mergedPrinciple: 'Communicate clearly and plainly.',
						mergedProvenance: 'Consolidated from clarity traits.',
					},
					{
						sourceTraitIds: [t3.id, t4.id],
						mergedPrinciple: 'Preserve context and provenance.',
						mergedProvenance: 'Consolidated from tracking traits.',
					},
				],
				promotedTraitIds: [],
				carriedTraitIds: [],
			},
			{ now },
		);

		const afterCount = listTraits(db, soul.id, { status: 'active' }).length;
		strictEqual(afterCount, 2);
	});
});
