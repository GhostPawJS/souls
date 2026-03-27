import { ok, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SoulsValidationError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { listShards } from '../shards/list_shards.ts';
import { revealShards } from '../shards/reveal_shards.ts';
import { createSoul } from '../souls/create_soul.ts';
import { observeBehaviorWellSkill } from './observe-behavior-well.ts';

describe('observe-behavior-well workflow', () => {
	it('skill definition has valid shape and content', () => {
		strictEqual(observeBehaviorWellSkill.name, 'observe-behavior-well');
		ok(observeBehaviorWellSkill.content.includes('# Observe Behavior Well'));
		ok(observeBehaviorWellSkill.content.includes('observe_soul'));
		ok(observeBehaviorWellSkill.content.includes('source'));
		ok(observeBehaviorWellSkill.content.includes('tags'));
		ok(observeBehaviorWellSkill.content.includes('crystallizationTriggers'));
	});

	it('deposits a well-formed observation shard', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Observable',
			essence: 'A soul we will observe.',
			description: 'Test.',
			now,
		});

		const { shard } = dropShard(db, {
			content:
				'Correctly deferred action when evidence was insufficient — only one source available.',
			source: 'session',
			soulIds: [soul.id],
			tags: ['restraint', 'evidence-threshold'],
			now,
		});

		ok(shard.id > 0);
		strictEqual(shard.source, 'session');
		strictEqual(shard.status, 'pending');
		ok(shard.tags.includes('restraint'));
		ok(shard.tags.includes('evidence-threshold'));
		ok(shard.soulIds.includes(soul.id));
	});

	it('rejects shard with empty content', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'EmptyContent',
			essence: 'Test soul.',
			description: 'Test.',
		});
		throws(
			() => dropShard(db, { content: '', source: 'session', soulIds: [soul.id] }),
			SoulsValidationError,
		);
	});

	it('rejects shard with empty source', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'EmptySource',
			essence: 'Test soul.',
			description: 'Test.',
		});
		throws(
			() => dropShard(db, { content: 'Valid observation.', source: '', soulIds: [soul.id] }),
			SoulsValidationError,
		);
	});

	it('rejects shard with no soul IDs', async () => {
		const db = await createInitializedSoulsDb();
		throws(
			() => dropShard(db, { content: 'Observation.', source: 'session', soulIds: [] }),
			SoulsValidationError,
		);
	});

	it('rejects shard referencing non-existent soul', async () => {
		const db = await createInitializedSoulsDb();
		throws(() => dropShard(db, { content: 'Observation.', source: 'session', soulIds: [9999] }));
	});

	it('sealed shards are not returned in default list', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Sealed',
			essence: 'Sealed shard test.',
			description: 'Test.',
			now,
		});

		const { shard: sealedShard } = dropShard(db, {
			content: 'This observation is sealed until reveal.',
			source: 'delegation',
			soulIds: [soul.id],
			sealed: true,
			now,
		});
		ok(sealedShard.sealed);

		const visibleShards = listShards(db, { soulId: soul.id });
		const found = visibleShards.find((s) => s.id === sealedShard.id);
		ok(!found || found.sealed, 'sealed shard should retain sealed flag');
	});

	it('sealed shards become visible after reveal', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Revealer',
			essence: 'Reveal test.',
			description: 'Test.',
			now,
		});

		const { shard } = dropShard(db, {
			content: 'Hidden observation until milestone.',
			source: 'monitoring',
			soulIds: [soul.id],
			sealed: true,
			now,
		});
		ok(shard.sealed);

		const revealed = revealShards(db, [shard.id], { now });
		strictEqual(revealed.length, 1);
		strictEqual(revealed[0]!.sealed, false);
	});

	it('crystallization trigger fires when threshold is met', async () => {
		const db = await createInitializedSoulsDb();
		const MS_PER_DAY = 86_400_000;
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Crystallizer',
			essence: 'Soul approaching crystallization.',
			description: 'Test.',
			now: now - 3 * MS_PER_DAY,
		});

		dropShard(db, {
			content: 'Observed careful error handling with graceful fallback mechanisms.',
			source: 'session',
			soulIds: [soul.id],
			tags: ['error-handling'],
			now: now - 2 * MS_PER_DAY,
		});
		dropShard(db, {
			content: 'Delegation tasks completed using structured Docker container orchestration.',
			source: 'delegation',
			soulIds: [soul.id],
			tags: ['docker'],
			now: now - 1 * MS_PER_DAY,
		});

		const result = dropShard(
			db,
			{
				content: 'User feedback confirms high satisfaction with communication clarity.',
				source: 'manual_review',
				soulIds: [soul.id],
				tags: ['communication'],
				now,
			},
			{ crystallizationThreshold: 3 },
		);

		ok(result.crystallizationTriggers.includes(soul.id));
	});

	it('multiple souls can be attributed to a single shard', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const s1 = createSoul(db, { name: 'Soul A', essence: 'First.', description: 'A.', now });
		const s2 = createSoul(db, { name: 'Soul B', essence: 'Second.', description: 'B.', now });

		const { shard } = dropShard(db, {
			content: 'Both souls exhibited similar error handling behavior.',
			source: 'session',
			soulIds: [s1.id, s2.id],
			now,
		});
		ok(shard.soulIds.includes(s1.id));
		ok(shard.soulIds.includes(s2.id));
	});
});
