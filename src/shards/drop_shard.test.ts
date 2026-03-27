import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShard } from './drop_shard.ts';

const DAY = 86_400_000;

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('dropShard', () => {
	it('creates a pending shard', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const { shard } = dropShard(db, {
			content: 'The agent hesitated before acting.',
			source: 'session-1',
			soulIds: [soul.id],
		});

		ok(shard.id > 0);
		strictEqual(shard.status, 'pending');
		strictEqual(shard.soulIds[0], soul.id);
	});

	it('normalizes content', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const { shard } = dropShard(db, {
			content: '  spaced   out  ',
			source: 'test',
			soulIds: [soul.id],
		});
		strictEqual(shard.content, 'spaced out');
	});

	it('stores normalized tags', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const { shard } = dropShard(db, {
			content: 'Observed caution.',
			source: 'test',
			soulIds: [soul.id],
			tags: ['CAUTION', 'caution', 'patience'],
		});
		strictEqual(shard.tags.length, 2);
		ok(shard.tags.includes('caution'));
		ok(shard.tags.includes('patience'));
	});

	it('returns empty crystallizationTriggers when conditions not met (single source)', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D', now: DAY });
		let result = { crystallizationTriggers: [] as number[] };
		for (let i = 0; i < 5; i++) {
			result = dropShard(
				db,
				{
					content: `Observation ${i}`,
					source: 'single_source',
					soulIds: [soul.id],
					now: (i + 2) * DAY,
				},
				{ crystallizationThreshold: 3, now: 10 * DAY },
			);
		}
		// Source diversity < 2 → no triggers
		strictEqual(result.crystallizationTriggers.length, 0);
	});

	it('triggers crystallization when all 5 conditions are met', () => {
		const soul = createSoul(db, {
			name: 'Aria',
			essence: 'E',
			description: 'D',
			now: DAY,
		});
		const contents = [
			'the agent deliberated carefully before acting on the request here',
			'delegation produced an error in the docker context setup today',
			'communication needs improvement in technical explanations given',
		];
		let result = { crystallizationTriggers: [] as number[] };
		for (let i = 0; i < 3; i++) {
			result = dropShard(
				db,
				{
					content: contents[i]!,
					source: i === 0 ? 'src_a' : 'src_b',
					soulIds: [soul.id],
					now: (i + 2) * DAY,
				},
				{ crystallizationThreshold: 3, now: 10 * DAY },
			);
		}
		ok(result.crystallizationTriggers.includes(soul.id));
	});
});
