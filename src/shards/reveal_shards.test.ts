import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShard } from './drop_shard.ts';
import { getShardOrThrow } from './get_shard_or_throw.ts';
import { revealShards } from './reveal_shards.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('revealShards', () => {
	it('unseals deferred shards', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const { shard } = dropShard(db, {
			content: 'Observation.',
			source: 'test',
			soulIds: [soul.id],
			sealed: true,
		});
		strictEqual(shard.sealed, true);

		revealShards(db, [shard.id]);
		strictEqual(getShardOrThrow(db, shard.id).sealed, false);
	});
});
