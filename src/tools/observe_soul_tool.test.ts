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
