import { ok, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SoulsStateError } from '../errors.ts';
import { levelUp } from '../levels/level_up.ts';
import { revertLevelUp } from '../levels/revert_level_up.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { formatEvidence } from '../shards/format_evidence.ts';
import { createSoul } from '../souls/create_soul.ts';
import { getSoul } from '../souls/get_soul.ts';
import { getSoulProfile } from '../souls/get_soul_profile.ts';
import { addTrait } from '../traits/add_trait.ts';
import { listTraits } from '../traits/list_traits.ts';
import { revertTrait } from '../traits/revert_trait.ts';
import { detectAndFixRegressionSkill } from './detect-and-fix-regression.ts';

describe('detect-and-fix-regression workflow', () => {
	it('skill definition has valid shape and content', () => {
		strictEqual(detectAndFixRegressionSkill.name, 'detect-and-fix-regression');
		ok(detectAndFixRegressionSkill.content.includes('# Detect and Fix Regression'));
		ok(detectAndFixRegressionSkill.content.includes('revert_trait'));
		ok(detectAndFixRegressionSkill.content.includes('level_up_soul'));
		ok(detectAndFixRegressionSkill.content.includes('inspect_souls_item'));
	});

	it('revert a regressive trait and deposit follow-up observation', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Regressor',
			essence: 'A soul that will experience regression.',
			description: 'Test.',
			now,
		});

		const goodTrait = addTrait(db, soul.id, {
			principle: 'Be concise in all responses.',
			provenance: 'Established in early sessions.',
			now,
		});
		const badTrait = addTrait(db, soul.id, {
			principle: 'Always use maximum verbosity.',
			provenance: 'Added after a single verbose-positive feedback shard.',
			now,
		});

		dropShard(db, {
			content: 'After adding verbosity trait, responses became unfocused and repetitive.',
			source: 'session',
			soulIds: [soul.id],
			tags: ['regression', 'verbosity'],
			now,
		});

		const reverted = revertTrait(db, badTrait.id, { now });
		strictEqual(reverted.status, 'reverted');

		const activeTraits = listTraits(db, soul.id, { status: 'active' });
		strictEqual(activeTraits.length, 1);
		strictEqual(activeTraits[0]!.id, goodTrait.id);

		dropShard(db, {
			content:
				'Reverted verbosity trait due to regression. Future refinement should require multi-source evidence.',
			source: 'retrospective',
			soulIds: [soul.id],
			tags: ['regression-fix', 'retrospective'],
			now,
		});

		const profile = getSoulProfile(db, soul.id, { now });
		strictEqual(profile.pendingShardCount, 2);
	});

	it('revert a level-up that caused regression', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'LevelRegressor',
			essence: 'Original clear essence before level-up.',
			description: 'Test.',
			now,
		});

		const t1 = addTrait(db, soul.id, { principle: 'Trait A', provenance: 'PA', now });
		const t2 = addTrait(db, soul.id, { principle: 'Trait B', provenance: 'PB', now });

		levelUp(
			db,
			soul.id,
			{
				newEssence: 'A regressive essence that lost clarity.',
				consolidations: [],
				promotedTraitIds: [t1.id],
				carriedTraitIds: [t2.id],
			},
			{ now },
		);

		const afterLevelUp = getSoul(db, soul.id);
		strictEqual(afterLevelUp!.level, 2);
		strictEqual(afterLevelUp!.essence, 'A regressive essence that lost clarity.');

		revertLevelUp(db, soul.id, { now });

		const afterRevert = getSoul(db, soul.id);
		strictEqual(afterRevert!.level, 1);
		strictEqual(afterRevert!.essence, 'Original clear essence before level-up.');

		const traits = listTraits(db, soul.id, { status: 'active' });
		strictEqual(traits.length, 2);
	});

	it('cannot revert trait that is already reverted', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'DoubleRevert',
			essence: 'Testing double revert.',
			description: 'Test.',
		});
		const trait = addTrait(db, soul.id, {
			principle: 'Some principle.',
			provenance: 'Some provenance.',
		});
		revertTrait(db, trait.id);
		throws(() => revertTrait(db, trait.id), SoulsStateError);
	});

	it('cannot revert level-up on level-1 soul', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'FreshSoul',
			essence: 'Brand new at level 1.',
			description: 'Test.',
		});
		throws(() => revertLevelUp(db, soul.id), SoulsStateError);
	});

	it('evidence report is available after reverting trait', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'EvidenceCheck',
			essence: 'Soul for evidence check after revert.',
			description: 'Test.',
			now,
		});
		addTrait(db, soul.id, { principle: 'Active trait.', provenance: 'Prov.', now });
		const bad = addTrait(db, soul.id, { principle: 'Bad trait.', provenance: 'Prov.', now });

		dropShard(db, {
			content: 'Observed regression from bad trait: outputs are unclear.',
			source: 'session',
			soulIds: [soul.id],
			tags: ['regression'],
			now,
		});

		revertTrait(db, bad.id, { now });

		const report = formatEvidence(db, soul.id, { now });
		ok(report.pendingCount >= 1);
		ok(report.renderedMarkdown.length > 0);
	});
});
