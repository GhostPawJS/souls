import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { createSoul } from '../souls/create_soul.ts';
import { getSoulProfile } from '../souls/get_soul_profile.ts';
import { listSouls } from '../souls/list_souls.ts';
import { stampAttuned } from '../souls/stamp_attuned.ts';
import { addTrait } from '../traits/add_trait.ts';
import { reviewSoulHealthSkill } from './review-soul-health.ts';

describe('review-soul-health workflow', () => {
	it('skill definition has valid shape and content', () => {
		strictEqual(reviewSoulHealthSkill.name, 'review-soul-health');
		ok(reviewSoulHealthSkill.content.includes('# Review Soul Health'));
		ok(reviewSoulHealthSkill.content.includes('review_souls'));
		ok(reviewSoulHealthSkill.content.includes('inspect_souls_item'));
		ok(reviewSoulHealthSkill.content.includes('health'));
		ok(reviewSoulHealthSkill.content.includes('stamp_attuned'));
	});

	it('healthy soul: traits fresh, evidence flowing, capacity headroom', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Healthy',
			essence: 'A well-maintained soul.',
			description: 'Test.',
			now,
		});

		addTrait(db, soul.id, { principle: 'Trait 1.', provenance: 'P1', now });
		addTrait(db, soul.id, { principle: 'Trait 2.', provenance: 'P2', now });

		dropShard(db, {
			content: 'Observation one.',
			source: 'session',
			soulIds: [soul.id],
			now,
		});
		dropShard(db, {
			content: 'Observation two.',
			source: 'delegation',
			soulIds: [soul.id],
			now,
		});
		dropShard(db, {
			content: 'Observation three.',
			source: 'manual_review',
			soulIds: [soul.id],
			now,
		});

		const profile = getSoulProfile(db, soul.id, { now });
		ok(profile.health > 0, 'health should be positive');
		ok(!profile.atCapacity, 'should not be at capacity');
		strictEqual(profile.pendingShardCount, 3);
	});

	it('soul with no pending shards has health 0', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Starved',
			essence: 'A soul with no evidence.',
			description: 'Test.',
			now,
		});
		addTrait(db, soul.id, { principle: 'Lonely trait.', provenance: 'P1', now });

		const profile = getSoulProfile(db, soul.id, { now });
		strictEqual(profile.pendingShardCount, 0);
		strictEqual(profile.health, 0);
	});

	it('soul at capacity has atCapacity flag', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Full',
			essence: 'A soul at capacity.',
			description: 'Test.',
			now,
		});

		const limit = 3;
		addTrait(db, soul.id, { principle: 'A.', provenance: 'PA', now }, { traitLimit: limit });
		addTrait(db, soul.id, { principle: 'B.', provenance: 'PB', now }, { traitLimit: limit });
		addTrait(db, soul.id, { principle: 'C.', provenance: 'PC', now }, { traitLimit: limit });

		const profile = getSoulProfile(db, soul.id, { traitLimit: limit, now });
		ok(profile.atCapacity);
		strictEqual(profile.activeTraitCount, limit);
	});

	it('crystallizationReady when enough shards from diverse sources', async () => {
		const db = await createInitializedSoulsDb();
		const MS_PER_DAY = 86_400_000;
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Ready',
			essence: 'A soul ready for crystallization.',
			description: 'Test.',
			now: now - 3 * MS_PER_DAY,
		});

		dropShard(db, {
			content: 'Observed careful error recovery with clear diagnostic messages.',
			source: 'session',
			soulIds: [soul.id],
			now: now - 2 * MS_PER_DAY,
		});
		dropShard(db, {
			content: 'Delegation outputs used structured Docker container orchestration.',
			source: 'delegation',
			soulIds: [soul.id],
			now: now - 1 * MS_PER_DAY,
		});
		dropShard(db, {
			content: 'Manual review shows high quality communication with the user.',
			source: 'manual_review',
			soulIds: [soul.id],
			now,
		});

		const profile = getSoulProfile(db, soul.id, {
			crystallizationThreshold: 3,
			now,
		});
		ok(profile.crystallizationReady);
	});

	it('listing all souls provides overview for health review', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		createSoul(db, { name: 'A', essence: 'First.', description: 'A.', now });
		createSoul(db, { name: 'B', essence: 'Second.', description: 'B.', now });

		const souls = listSouls(db);
		strictEqual(souls.length, 2);
		ok(souls.every((s) => s.level >= 1));
	});

	it('stamp attunement resets the recency baseline', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Stamper',
			essence: 'Attunement stamp test.',
			description: 'Test.',
			now,
		});
		ok(soul.lastAttunedAt === null);

		const stamped = stampAttuned(db, soul.id, { now });
		ok(stamped.lastAttunedAt !== null);
		strictEqual(stamped.lastAttunedAt, now);
	});
});
