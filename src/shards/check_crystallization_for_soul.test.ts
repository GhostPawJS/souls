import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { checkCrystallizationForSoul } from './check_crystallization_for_soul.ts';
import { dropShard } from './drop_shard.ts';

const DAY = 86_400_000;

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('checkCrystallizationForSoul', () => {
	it('returns null for a dormant soul', () => {
		const soul = createSoul(db, { name: 'Dormant', essence: 'e', description: 'd', now: DAY });
		db.prepare(`UPDATE souls SET deleted_at = ? WHERE id = ?`).run(2 * DAY, soul.id);
		const result = checkCrystallizationForSoul(db, soul.id, { now: 3 * DAY });
		strictEqual(result, null);
	});

	it('returns null when pending count below threshold', () => {
		const soul = createSoul(db, { name: 'S1', essence: 'e', description: 'd', now: DAY });
		dropShard(db, {
			content: 'observation one',
			source: 'src_a',
			soulIds: [soul.id],
			now: 2 * DAY,
		});
		const result = checkCrystallizationForSoul(db, soul.id, {
			crystallizationThreshold: 3,
			now: 3 * DAY,
		});
		strictEqual(result, null);
	});

	it('returns null when source diversity < 2', () => {
		const soul = createSoul(db, { name: 'S2', essence: 'e', description: 'd', now: DAY });
		for (let i = 0; i < 3; i++) {
			dropShard(db, {
				content: `unique content observation ${i} foo bar baz`,
				source: 'same_source',
				soulIds: [soul.id],
				now: (i + 2) * DAY,
			});
		}
		const result = checkCrystallizationForSoul(db, soul.id, {
			crystallizationThreshold: 3,
			now: 10 * DAY,
		});
		strictEqual(result, null);
	});

	it('returns null when age spread < 1 day', () => {
		const soul = createSoul(db, { name: 'S3', essence: 'e', description: 'd', now: DAY });
		const base = 2 * DAY;
		for (let i = 0; i < 3; i++) {
			dropShard(db, {
				content: `unique content observation ${i} foo bar baz`,
				source: i % 2 === 0 ? 'src_a' : 'src_b',
				soulIds: [soul.id],
				now: base + i * 1000, // all within seconds
			});
		}
		const result = checkCrystallizationForSoul(db, soul.id, {
			crystallizationThreshold: 3,
			now: base + 10_000,
		});
		strictEqual(result, null);
	});

	it('returns null when all shards are before lastAttunedAt', () => {
		const soul = createSoul(db, { name: 'S4', essence: 'e', description: 'd', now: DAY });
		const attuneTime = 10 * DAY;
		for (let i = 0; i < 3; i++) {
			dropShard(db, {
				content: `unique observation alpha beta gamma delta ${i}`,
				source: i % 2 === 0 ? 'src_a' : 'src_b',
				soulIds: [soul.id],
				now: (i + 2) * DAY,
			});
		}
		db.prepare(`UPDATE souls SET last_attuned_at = ? WHERE id = ?`).run(attuneTime, soul.id);
		const result = checkCrystallizationForSoul(db, soul.id, {
			crystallizationThreshold: 3,
			now: attuneTime + DAY,
		});
		strictEqual(result, null);
	});

	it('returns a result with all fields when all conditions met', () => {
		const soul = createSoul(db, { name: 'S5', essence: 'e', description: 'd', now: DAY });
		const contents = [
			'the quick brown fox jumps over the lazy dog in the forest',
			'delegation produced an error in the docker context setup today',
			'communication style needs improvement in technical explanations given',
		];
		for (let i = 0; i < 3; i++) {
			dropShard(db, {
				content: contents[i]!,
				source: i === 0 ? 'src_a' : 'src_b',
				soulIds: [soul.id],
				now: (i + 2) * DAY,
			});
		}
		const result = checkCrystallizationForSoul(db, soul.id, {
			crystallizationThreshold: 3,
			clusterThreshold: 0.5,
			now: 10 * DAY,
		});
		ok(result !== null);
		ok(result.ready);
		ok(result.pendingCount >= 3);
		ok(result.sourceDiversity >= 2);
		ok(result.ageSpreadDays >= 1);
		ok(result.clusterCount >= 2);
		ok(result.priorityScore > 0);
	});
});
