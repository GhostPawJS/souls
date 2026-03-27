import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShard } from './drop_shard.ts';
import { listShards } from './list_shards.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('listShards', () => {
	it('lists pending unsealed shards for a soul', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		dropShard(db, { content: 'Obs A', source: 'test', soulIds: [soul.id] });
		dropShard(db, { content: 'Obs B', source: 'test', soulIds: [soul.id] });

		const shards = listShards(db, { soulId: soul.id });
		strictEqual(shards.length, 2);
	});

	it('excludes sealed shards', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		dropShard(db, { content: 'Obs A', source: 'test', soulIds: [soul.id] });
		dropShard(db, { content: 'Obs B', source: 'test', soulIds: [soul.id], sealed: true });

		const shards = listShards(db, { soulId: soul.id });
		strictEqual(shards.length, 1);
	});

	it('filters by tag', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		dropShard(db, {
			content: 'Tagged obs',
			source: 'test',
			soulIds: [soul.id],
			tags: ['planning'],
		});
		dropShard(db, { content: 'Untagged', source: 'test', soulIds: [soul.id] });

		const shards = listShards(db, { soulId: soul.id, tags: ['planning'] });
		strictEqual(shards.length, 1);
		ok(shards[0]?.tags.includes('planning'));
	});
});
