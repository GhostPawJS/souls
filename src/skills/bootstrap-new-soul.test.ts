import { ok, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SoulsStateError, SoulsValidationError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { createSoul } from '../souls/create_soul.ts';
import { getSoulProfile } from '../souls/get_soul_profile.ts';
import { addTrait } from '../traits/add_trait.ts';
import { bootstrapNewSoulSkill } from './bootstrap-new-soul.ts';

describe('bootstrap-new-soul workflow', () => {
	it('skill definition has valid shape and content', () => {
		strictEqual(bootstrapNewSoulSkill.name, 'bootstrap-new-soul');
		ok(bootstrapNewSoulSkill.content.includes('# Bootstrap New Soul'));
		ok(bootstrapNewSoulSkill.content.includes('manage_soul'));
		ok(bootstrapNewSoulSkill.content.includes('refine_soul'));
		ok(bootstrapNewSoulSkill.content.includes('observe_soul'));
		ok(bootstrapNewSoulSkill.content.includes('inspect_souls_item'));
		ok(bootstrapNewSoulSkill.description.length > 0);
	});

	it('full bootstrap: create soul → add traits → drop shards → verify', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();

		const soul = createSoul(db, {
			name: 'Attuner',
			essence:
				'A reflective persona that observes behavior and refines its own operating traits over time.',
			description: 'Identity refinement engine.',
			now,
		});
		ok(soul.id > 0);
		strictEqual(soul.level, 1);

		const t1 = addTrait(db, soul.id, {
			principle: 'Prefer specific observations over general summaries.',
			provenance: 'Founding design principle from CONCEPT.md.',
			now,
		});
		const t2 = addTrait(db, soul.id, {
			principle: 'Evidence must converge across 2+ sources before acting.',
			provenance: 'Multi-source convergence requirement from specification.',
			now,
		});
		ok(t1.status === 'active');
		ok(t2.status === 'active');

		dropShard(db, {
			content: 'Attuner correctly deferred trait mutation when only one source was available.',
			source: 'session',
			soulIds: [soul.id],
			tags: ['restraint', 'evidence-threshold'],
			now,
		});
		dropShard(db, {
			content: 'Attuner produced a well-scoped observation instead of a vague summary.',
			source: 'manual_review',
			soulIds: [soul.id],
			tags: ['observation-quality'],
			now,
		});

		const profile = getSoulProfile(db, soul.id, { now });
		strictEqual(profile.activeTraitCount, 2);
		strictEqual(profile.pendingShardCount, 2);
		ok(profile.soul.essence.includes('reflective'));
	});

	it('rejects bootstrap with empty name', async () => {
		const db = await createInitializedSoulsDb();
		throws(
			() => createSoul(db, { name: '', essence: 'Valid essence text.', description: 'Desc.' }),
			SoulsValidationError,
		);
	});

	it('rejects bootstrap with empty essence', async () => {
		const db = await createInitializedSoulsDb();
		throws(
			() => createSoul(db, { name: 'Test', essence: '', description: 'Desc.' }),
			SoulsValidationError,
		);
	});

	it('rejects trait with empty principle', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'Test',
			essence: 'A test soul for validation.',
			description: 'Test.',
		});
		throws(
			() => addTrait(db, soul.id, { principle: '', provenance: 'reason' }),
			SoulsValidationError,
		);
	});

	it('rejects trait with empty provenance', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'Test',
			essence: 'A test soul for validation.',
			description: 'Test.',
		});
		throws(
			() => addTrait(db, soul.id, { principle: 'Be specific', provenance: '' }),
			SoulsValidationError,
		);
	});

	it('blocks adding traits beyond the limit', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'Capped',
			essence: 'A soul with low trait limit.',
			description: 'Test.',
		});
		addTrait(db, soul.id, { principle: 'Trait 1', provenance: 'P1' }, { traitLimit: 2 });
		addTrait(db, soul.id, { principle: 'Trait 2', provenance: 'P2' }, { traitLimit: 2 });
		throws(
			() => addTrait(db, soul.id, { principle: 'Trait 3', provenance: 'P3' }, { traitLimit: 2 }),
			SoulsStateError,
		);
	});

	it('rejects shard with empty content', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'Test',
			essence: 'A test soul for validation.',
			description: 'Test.',
		});
		throws(
			() => dropShard(db, { content: '', source: 'session', soulIds: [soul.id] }),
			SoulsValidationError,
		);
	});

	it('rejects shard attributed to non-existent soul', async () => {
		const db = await createInitializedSoulsDb();
		throws(() => dropShard(db, { content: 'Valid content.', source: 'session', soulIds: [9999] }));
	});

	it('rejects shard with no soul IDs', async () => {
		const db = await createInitializedSoulsDb();
		throws(
			() => dropShard(db, { content: 'Valid content.', source: 'session', soulIds: [] }),
			SoulsValidationError,
		);
	});
});
