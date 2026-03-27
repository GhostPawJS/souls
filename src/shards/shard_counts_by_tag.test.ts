import { ok } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShard } from './drop_shard.ts';
import { shardCountsByTag } from './shard_counts_by_tag.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('shardCountsByTag', () => {
	it('returns tag breakdown', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		dropShard(db, { content: 'Obs A', source: 'test', soulIds: [soul.id], tags: ['planning'] });
		dropShard(db, {
			content: 'Obs B',
			source: 'test',
			soulIds: [soul.id],
			tags: ['planning', 'caution'],
		});

		const counts = shardCountsByTag(db);
		const planningCount = counts.find((c) => c.tag === 'planning');
		ok(planningCount);
		ok(planningCount.count >= 2);
	});
});
