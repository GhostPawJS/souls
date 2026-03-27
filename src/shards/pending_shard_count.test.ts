import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShard } from './drop_shard.ts';
import { pendingShardCount } from './pending_shard_count.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('pendingShardCount', () => {
	it('returns 0 for a new soul', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		strictEqual(pendingShardCount(db, soul.id), 0);
	});

	it('increments after dropping shards', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		dropShard(db, { content: 'Obs A', source: 'test', soulIds: [soul.id] });
		dropShard(db, { content: 'Obs B', source: 'test', soulIds: [soul.id] });
		strictEqual(pendingShardCount(db, soul.id), 2);
	});
});
