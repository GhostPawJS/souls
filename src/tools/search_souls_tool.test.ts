import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { createSoul } from '../souls/create_soul.ts';
import { searchSoulsToolHandler } from './search_souls_tool.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('searchSoulsToolHandler', () => {
	it('lists pending shards without query', () => {
		const soul = createSoul(db, { name: 'S', essence: 'E', description: 'D' });
		dropShard(db, {
			content: 'Agent chose a good strategy.',
			source: 'session',
			soulIds: [soul.id],
		});
		const result = searchSoulsToolHandler(db, {});
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { count: number };
			strictEqual(data.count, 1);
		}
	});

	it('searches shards by FTS query', () => {
		const soul = createSoul(db, { name: 'S', essence: 'E', description: 'D' });
		dropShard(db, {
			content: 'Agent delegated the docker task.',
			source: 'delegation',
			soulIds: [soul.id],
		});
		dropShard(db, {
			content: 'Agent reviewed the code thoroughly.',
			source: 'session',
			soulIds: [soul.id],
		});
		const result = searchSoulsToolHandler(db, { query: 'docker' });
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { count: number };
			strictEqual(data.count, 1);
		}
	});

	it('filters by soulId', () => {
		const soulA = createSoul(db, { name: 'A', essence: 'EA', description: 'DA' });
		const soulB = createSoul(db, { name: 'B', essence: 'EB', description: 'DB' });
		dropShard(db, { content: 'Obs A.', source: 'test', soulIds: [soulA.id] });
		dropShard(db, { content: 'Obs B.', source: 'test', soulIds: [soulB.id] });
		const result = searchSoulsToolHandler(db, { soulId: soulA.id });
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { count: number };
			strictEqual(data.count, 1);
		}
	});

	it('returns empty result for no matches', () => {
		const result = searchSoulsToolHandler(db, { query: 'nonexistent' });
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { count: number };
			strictEqual(data.count, 0);
		}
	});
});
