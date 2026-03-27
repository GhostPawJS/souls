import { ok, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsNotFoundError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShard } from './drop_shard.ts';
import { getShardOrThrow } from './get_shard_or_throw.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('getShardOrThrow', () => {
	it('returns shard', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const { shard } = dropShard(db, { content: 'Obs', source: 'test', soulIds: [soul.id] });
		ok(getShardOrThrow(db, shard.id));
	});

	it('throws for unknown id', () => {
		throws(() => getShardOrThrow(db, 9999), SoulsNotFoundError);
	});
});
