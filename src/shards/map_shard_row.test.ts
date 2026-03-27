import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShard } from './drop_shard.ts';
import { getShardOrThrow } from './get_shard_or_throw.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('mapShardRow', () => {
	it('maps sealed field to boolean', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const { shard } = dropShard(db, {
			content: 'Obs',
			source: 'test',
			soulIds: [soul.id],
			sealed: true,
		});
		const rec = getShardOrThrow(db, shard.id);
		strictEqual(rec.sealed, true);
		ok(typeof rec.sealed === 'boolean');
	});
});
