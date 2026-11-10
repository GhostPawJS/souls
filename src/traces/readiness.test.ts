import { ok, strictEqual } from 'node:assert';
import { it } from 'node:test';
import { setSoulsConfig } from '../config.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { checkCrystallizationForSoul } from '../shards/check_crystallization_for_soul.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { createSoul } from '../souls/create_soul.ts';
import { citeTrace } from './cite_trace.ts';
import { recordTrace } from './record_trace.ts';
import { settleTrace } from './settle_trace.ts';

const NOW = Date.UTC(2026, 10, 10);
const DAY = 86400000;
it('requires actual convergence; live trace backing joins otherwise separate clusters', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const soul = createSoul(db, { name: 'S', essence: 'e', description: 'd', now: NOW - 10 * DAY });
		const contents = [
			'the quick brown fox jumps over the lazy dog',
			'careful database schema inspection avoids data loss',
			'a musician practiced piano every evening',
		];
		const ids = contents.map(
			(content, i) =>
				dropShard(db, {
					content,
					source: i === 0 ? 'a' : 'b',
					soulIds: [soul.id],
					now: NOW - (3 - i) * DAY,
				}).shard.id,
		);
		const options = { now: NOW };
		strictEqual(checkCrystallizationForSoul(db, soul.id, options)?.ready, false);
		strictEqual(
			checkCrystallizationForSoul(db, soul.id, { ...options, readiness: 'legacy' })?.ready,
			true,
		);
		const t = recordTrace(db, {
			text: 'A shared review',
			souls: [{ soulId: soul.id, role: 0 }],
			weight: 0.5,
			now: NOW,
		});
		for (const id of ids) citeTrace(db, id, t.id, { now: NOW });
		const check = checkCrystallizationForSoul(db, soul.id, options);
		ok(check?.ready);
		strictEqual(check.convergedClusterCount, 1);
		strictEqual(check.largestClusterSize, 3);
		strictEqual(check.traceBackedCount, 3);
		strictEqual(check.priorityScore, 3 * 2 * 2 * (1 / 10) * 1.5);
		settleTrace(db, t.id, { as: 'dropped', reason: 'Not supported', now: NOW });
		strictEqual(checkCrystallizationForSoul(db, soul.id, options)?.ready, false);
		setSoulsConfig(db, 'readiness', 'legacy');
		strictEqual(checkCrystallizationForSoul(db, soul.id, options)?.ready, true);
		strictEqual(
			checkCrystallizationForSoul(db, soul.id, { ...options, readiness: 'converged' })?.ready,
			false,
		);
	} finally {
		db.close();
	}
});
it('accepts three similar shards across two sources without trace tables', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const s = createSoul(db, { name: 'S', essence: 'e', description: 'd', now: NOW - 10 * DAY });
		for (let i = 0; i < 3; i++)
			dropShard(db, {
				content: `Carefully reviewed the database migration and verified all rows ${i}`,
				source: i === 0 ? 'a' : 'b',
				soulIds: [s.id],
				now: NOW - (3 - i) * DAY,
			});
		strictEqual(checkCrystallizationForSoul(db, s.id, { now: NOW })?.ready, true);
	} finally {
		db.close();
	}
});
