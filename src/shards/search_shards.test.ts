import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShard } from './drop_shard.ts';
import { searchShards } from './search_shards.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('searchShards', () => {
	it('returns empty for empty query', () => {
		strictEqual(searchShards(db, '').length, 0);
	});

	it('finds shards matching the query', async () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		dropShard(db, {
			content: 'The agent was deliberate in its planning.',
			source: 'test',
			soulIds: [soul.id],
		});
		dropShard(db, {
			content: 'An unrelated observation about weather.',
			source: 'test',
			soulIds: [soul.id],
		});

		const results = searchShards(db, 'deliberate');
		ok(results.length >= 1);
		ok(results.some((s) => s.content.includes('deliberate')));
	});
});
