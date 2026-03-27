import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { runMaintenance } from '../maintenance.ts';
import { citeShard } from '../shards/cite_shard.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { createSoul } from '../souls/create_soul.ts';
import { getSoulProfile } from '../souls/get_soul_profile.ts';
import { addTrait } from '../traits/add_trait.ts';
import { runMaintenancePassSkill } from './run-maintenance-pass.ts';

describe('run-maintenance-pass workflow', () => {
	it('skill definition has valid shape and content', () => {
		strictEqual(runMaintenancePassSkill.name, 'run-maintenance-pass');
		ok(runMaintenancePassSkill.content.includes('# Run Maintenance Pass'));
		ok(runMaintenancePassSkill.content.includes('review_souls'));
		ok(runMaintenancePassSkill.content.includes('fadedShardCount'));
		ok(runMaintenancePassSkill.content.includes('readySouls'));
		ok(runMaintenancePassSkill.content.includes('inspect_souls_item'));
	});

	it('empty database yields zero faded and no ready souls', async () => {
		const db = await createInitializedSoulsDb();
		const result = runMaintenance(db);
		strictEqual(result.fadedShardCount, 0);
		strictEqual(result.readySouls.length, 0);
	});

	it('maintenance on active soul with insufficient shards returns empty readySouls', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'NotReady',
			essence: 'Not enough evidence.',
			description: 'Test.',
			now,
		});
		dropShard(db, {
			content: 'Single observation — not enough for crystallization.',
			source: 'session',
			soulIds: [soul.id],
			now,
		});

		const result = runMaintenance(db, { crystallizationThreshold: 3, now });
		strictEqual(result.readySouls.length, 0);
	});

	it('ready souls appear when crystallization threshold is met', async () => {
		const db = await createInitializedSoulsDb();
		const MS_PER_DAY = 86_400_000;
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'CrystalReady',
			essence: 'Ready for crystallization.',
			description: 'Test.',
			now: now - 3 * MS_PER_DAY,
		});

		dropShard(db, {
			content: 'Observed careful error handling with fallback mechanisms.',
			source: 'session',
			soulIds: [soul.id],
			now: now - 2 * MS_PER_DAY,
		});
		dropShard(db, {
			content: 'Delegation used structured Docker container orchestration.',
			source: 'delegation',
			soulIds: [soul.id],
			now: now - 1 * MS_PER_DAY,
		});
		dropShard(db, {
			content: 'Manual review confirms strong communication with the user.',
			source: 'manual_review',
			soulIds: [soul.id],
			now,
		});

		const result = runMaintenance(db, {
			crystallizationThreshold: 3,
			now,
		});
		ok(result.readySouls.length > 0);
		strictEqual(result.readySouls[0]!.soulId, soul.id);
		ok(result.readySouls[0]!.priorityScore > 0);
	});

	it('fading removes exhausted shards that are heavily cited', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Fader',
			essence: 'Fading test.',
			description: 'Test.',
			now,
		});

		const t1 = addTrait(db, soul.id, { principle: 'Trait 1.', provenance: 'P1', now });
		const t2 = addTrait(db, soul.id, { principle: 'Trait 2.', provenance: 'P2', now });
		const t3 = addTrait(db, soul.id, { principle: 'Trait 3.', provenance: 'P3', now });

		const { shard } = dropShard(db, {
			content: 'Exhausted observation cited by many traits.',
			source: 'session',
			soulIds: [soul.id],
			now,
		});

		citeShard(db, shard.id, t1.id);
		citeShard(db, shard.id, t2.id);
		citeShard(db, shard.id, t3.id);

		const result = runMaintenance(db, { fadeCitationThreshold: 3, now });
		ok(result.fadedShardCount >= 1);
	});

	it('multiple ready souls are sorted by priority', async () => {
		const db = await createInitializedSoulsDb();
		const MS_PER_DAY = 86_400_000;
		const now = Date.now();

		const s1 = createSoul(db, {
			name: 'Low',
			essence: 'Low priority.',
			description: 'A.',
			now: now - 4 * MS_PER_DAY,
		});
		const s2 = createSoul(db, {
			name: 'High',
			essence: 'High priority.',
			description: 'B.',
			now: now - 4 * MS_PER_DAY,
		});

		const lowContents = [
			'Careful error recovery with diagnostic messages.',
			'Docker container orchestration was structured.',
			'Communication with end users was clear and helpful.',
		];
		for (let i = 0; i < 3; i++) {
			dropShard(db, {
				content: lowContents[i]!,
				source: ['session', 'delegation', 'manual_review'][i]!,
				soulIds: [s1.id],
				now: now - (2 - i) * MS_PER_DAY,
			});
		}

		const highContents = [
			'Observed precise input validation before command execution.',
			'Docker delegation outputs were well-structured and organized.',
			'User feedback confirms strong communication clarity.',
			'Retrospective shows improved error handling patterns.',
			'Monitoring detected zero unhandled exceptions.',
			'Session logs show excellent technical documentation quality.',
		];
		for (let i = 0; i < 6; i++) {
			dropShard(db, {
				content: highContents[i]!,
				source: [
					'session',
					'delegation',
					'manual_review',
					'user_feedback',
					'retrospective',
					'monitoring',
				][i]!,
				soulIds: [s2.id],
				now: now - (3 - Math.min(i, 3)) * MS_PER_DAY,
			});
		}

		const result = runMaintenance(db, {
			crystallizationThreshold: 3,
			now,
		});
		ok(result.readySouls.length >= 2);
		ok(result.readySouls[0]!.priorityScore >= result.readySouls[1]!.priorityScore);
	});

	it('after maintenance, profile reflects clean state', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Clean',
			essence: 'Post-maintenance check.',
			description: 'Test.',
			now,
		});

		dropShard(db, {
			content: 'Fresh observation.',
			source: 'session',
			soulIds: [soul.id],
			now,
		});

		runMaintenance(db, { now });

		const profile = getSoulProfile(db, soul.id, { now });
		ok(profile.pendingShardCount >= 1);
		strictEqual(profile.soul.name, 'Clean');
	});
});
