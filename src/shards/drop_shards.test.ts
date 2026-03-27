import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { dropShards } from './drop_shards.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('dropShards', () => {
	it('deposits multiple shards', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const { shards } = dropShards(db, [
			{ content: 'Observation A', source: 'test', soulIds: [soul.id] },
			{ content: 'Observation B', source: 'test', soulIds: [soul.id] },
		]);
		strictEqual(shards.length, 2);
	});

	it('returns empty result for empty input', () => {
		const result = dropShards(db, []);
		strictEqual(result.shards.length, 0);
		strictEqual(result.crystallizationTriggers.length, 0);
	});
});
