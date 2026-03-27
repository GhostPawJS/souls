import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { crystallizationReadiness } from './crystallization_readiness.ts';
import { dropShard } from './drop_shard.ts';

const DAY = 86_400_000;

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('crystallizationReadiness', () => {
	it('returns empty when no souls exist', () => {
		strictEqual(crystallizationReadiness(db).length, 0);
	});

	it('returns empty when pending count below threshold', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D', now: DAY });
		dropShard(db, { content: 'Obs one', source: 'src_a', soulIds: [soul.id], now: 2 * DAY });
		const results = crystallizationReadiness(db, { crystallizationThreshold: 5, now: 10 * DAY });
		strictEqual(results.length, 0);
	});

	it('returns empty when source diversity < 2', () => {
		const soul = createSoul(db, { name: 'B', essence: 'E', description: 'D', now: DAY });
		for (let i = 0; i < 3; i++) {
			dropShard(db, {
				content: `unique content observation number ${i} alpha beta gamma`,
				source: 'single_source',
				soulIds: [soul.id],
				now: (i + 2) * DAY,
			});
		}
		const results = crystallizationReadiness(db, { crystallizationThreshold: 3, now: 10 * DAY });
		strictEqual(results.length, 0);
	});

	it('excludes dormant souls', () => {
		const soul = createSoul(db, { name: 'D', essence: 'E', description: 'D', now: DAY });
		const contents = [
			'the agent deliberated carefully before acting on the request',
			'delegation produced an error in docker context setup today',
			'communication style needs improvement in technical explanations',
		];
		for (let i = 0; i < 3; i++) {
			dropShard(db, {
				content: contents[i]!,
				source: i === 0 ? 'src_a' : 'src_b',
				soulIds: [soul.id],
				now: (i + 2) * DAY,
			});
		}
		db.prepare(`UPDATE souls SET deleted_at = ? WHERE id = ?`).run(20 * DAY, soul.id);
		const results = crystallizationReadiness(db, { crystallizationThreshold: 3, now: 30 * DAY });
		strictEqual(results.length, 0);
	});

	it('returns ready souls with all expected fields', () => {
		const soul = createSoul(db, { name: 'E', essence: 'E', description: 'D', now: DAY });
		const contents = [
			'the agent deliberated carefully before acting on the complex request',
			'delegation produced an error in docker context setup today',
			'communication style needs significant improvement in technical explanations',
		];
		for (let i = 0; i < 3; i++) {
			dropShard(db, {
				content: contents[i]!,
				source: i === 0 ? 'src_a' : 'src_b',
				soulIds: [soul.id],
				now: (i + 2) * DAY,
			});
		}
		const results = crystallizationReadiness(db, { crystallizationThreshold: 3, now: 10 * DAY });
		ok(results.length > 0);
		const rec = results[0]!;
		strictEqual(rec.soulId, soul.id);
		ok(rec.pendingCount >= 3);
		ok(rec.sourceDiversity >= 2);
		ok(rec.ageSpreadDays >= 1);
		ok(rec.clusterCount >= 2);
		ok(rec.priorityScore > 0);
	});
});
