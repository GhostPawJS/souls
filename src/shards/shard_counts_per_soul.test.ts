import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShard } from './drop_shard.ts';
import { shardCountsPerSoul } from './shard_counts_per_soul.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('shardCountsPerSoul', () => {
	it('returns counts for each soul', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		dropShard(db, { content: 'Obs A', source: 'test', soulIds: [soul.id] });
		dropShard(db, { content: 'Obs B', source: 'test', soulIds: [soul.id] });

		const counts = shardCountsPerSoul(db);
		const soulCount = counts.find((c) => c.soulId === soul.id);
		ok(soulCount);
		strictEqual(soulCount.pendingCount, 2);
	});
});
