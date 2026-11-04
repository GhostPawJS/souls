import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { observeSoulToolHandler } from './observe_soul_tool.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('observeSoulToolHandler', () => {
	it('deposits a shard', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const result = observeSoulToolHandler(db, {
			action: 'drop',
			content: 'The agent hesitated.',
			source: 'session',
			soulIds: [soul.id],
		});
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { shardId: number };
			ok(data.shardId > 0);
		}
	});

	it('returns clarification when content is missing', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const result = observeSoulToolHandler(db, {
			action: 'drop',
			source: 'session',
			soulIds: [soul.id],
		});
		ok(!result.ok);
		strictEqual(result.outcome, 'needs_clarification');
	});

	it('returns error for unknown soul', () => {
		const result = observeSoulToolHandler(db, {
			action: 'drop',
			content: 'Test obs',
			source: 'test',
			soulIds: [99999],
		});
		ok(!result.ok);
		strictEqual(result.outcome, 'error');
	});
});

describe('idempotent observation summaries', () => {
	it('counts new and duplicate entries without changing returned shard counts', () => {
		const soul = createSoul(db, { name: 'Counts', essence: 'E', description: 'D' });
		const item = {
			content: 'Observation',
			source: 'session',
			soulIds: [soul.id],
			idempotencyKey: 'single',
		};
		const first = observeSoulToolHandler(db, { action: 'drop', ...item });
		ok(first.ok);
		strictEqual(first.summary, '1 shard deposited, 0 duplicates skipped.');
		const duplicate = observeSoulToolHandler(db, { action: 'drop', ...item });
		ok(duplicate.ok);
		strictEqual(duplicate.summary, '0 shards deposited, 1 duplicate skipped.');
		const shards = [item, { ...item, idempotencyKey: 'two' }, { ...item, idempotencyKey: 'three' }];
		for (const [summary, duplicates] of [
			['2 shards deposited, 1 duplicate skipped.', 1],
			['0 shards deposited, 3 duplicates skipped.', 3],
		] as const) {
			const result = observeSoulToolHandler(db, { action: 'drop_batch', shards });
			ok(result.ok);
			strictEqual(result.summary, summary);
			ok('duplicates' in result.data);
			strictEqual(result.data.duplicates, duplicates);
			strictEqual(result.data.shardCount, 3);
			strictEqual(result.data.result.shards.length, 3);
		}
	});
});
