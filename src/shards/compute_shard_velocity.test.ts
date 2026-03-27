import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { computeShardVelocity } from './compute_shard_velocity.ts';
import { dropShard } from './drop_shard.ts';

const MS_PER_DAY = 86_400_000;

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('computeShardVelocity', () => {
	it('returns 0 for a soul with no shards', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		strictEqual(computeShardVelocity(db, soul.id), 0);
	});

	it('returns positive velocity when recent window has more shards', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const now = Date.now();

		// Drop 1 shard in "previous" window (28-14 days ago)
		dropShard(db, {
			content: 'Old obs',
			source: 'test',
			soulIds: [soul.id],
			now: now - 20 * MS_PER_DAY,
		});

		// Drop 3 shards in "recent" window (< 14 days ago)
		for (let i = 0; i < 3; i++) {
			dropShard(db, {
				content: `Recent obs ${i}`,
				source: 'test',
				soulIds: [soul.id],
				now: now - 5 * MS_PER_DAY,
			});
		}

		const velocity = computeShardVelocity(db, soul.id, now);
		ok(velocity > 0);
	});
});
