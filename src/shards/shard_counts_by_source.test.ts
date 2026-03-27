import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShard } from './drop_shard.ts';
import { shardCountsBySource } from './shard_counts_by_source.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('shardCountsBySource', () => {
	it('returns empty when no shards exist', () => {
		strictEqual(shardCountsBySource(db).length, 0);
	});

	it('returns counts globally when no soulId given', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		dropShard(db, { content: 'obs1', source: 'session', soulIds: [soul.id] });
		dropShard(db, { content: 'obs2', source: 'session', soulIds: [soul.id] });
		dropShard(db, { content: 'obs3', source: 'review', soulIds: [soul.id] });

		const counts = shardCountsBySource(db);
		const session = counts.find((c) => c.source === 'session');
		const review = counts.find((c) => c.source === 'review');
		ok(session);
		strictEqual(session.count, 2);
		ok(review);
		strictEqual(review.count, 1);
	});

	it('filters by soulId when provided', () => {
		const soul1 = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const soul2 = createSoul(db, { name: 'B', essence: 'E', description: 'D' });
		dropShard(db, { content: 'obs1', source: 'session', soulIds: [soul1.id] });
		dropShard(db, { content: 'obs2', source: 'review', soulIds: [soul2.id] });

		const counts1 = shardCountsBySource(db, soul1.id);
		strictEqual(counts1.length, 1);
		strictEqual(counts1[0]!.source, 'session');

		const counts2 = shardCountsBySource(db, soul2.id);
		strictEqual(counts2.length, 1);
		strictEqual(counts2[0]!.source, 'review');
	});
});
