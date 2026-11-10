import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import * as write from '../write.ts';

const median = (values: number[]) =>
	[...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] as number;

test('writes on a 2,000-trace store stay incremental: one FTS backfill, bounded per-write time', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const owner = createSoul(db, {
			name: 'Owner',
			slug: 'owner',
			essence: 'e',
			description: 'd',
		}).id;
		const other = createSoul(db, {
			name: 'Other',
			slug: 'other',
			essence: 'e',
			description: 'd',
		}).id;
		const souls = [
			{ soulId: owner, role: 'owner' as const },
			{ soulId: other, role: 'counterpart' as const },
		];
		const long = 'Recurring check of the nightly routine and its notes. '.repeat(20);
		write.recordTraceBatch(
			db,
			Array.from({ length: 2000 }, (_, i) => ({
				text: i % 4 === 0 ? `${long} #${i}` : `Fact number ${i} about the store`,
				souls,
				tags: [`series:s${i % 31}`, i % 2 ? 'promise' : 'belief'],
				dueAt: Date.UTC(2026, 10, 1) + i * 60000,
			})),
		);
		const statements: string[] = [];
		const exec = db.exec.bind(db);
		db.exec = (sql: string) => {
			statements.push(sql);
			return exec(sql);
		};
		const timings = { record: [] as number[], settle: [] as number[], roll: [] as number[] };
		for (let i = 0; i < 15; i++) {
			let start = performance.now();
			const created = write.recordTrace(db, {
				text: `${long} new ${i}`,
				souls,
				tags: ['promise'],
				dueAt: '+1d',
			});
			timings.record.push(performance.now() - start);
			start = performance.now();
			write.settleTrace(db, created.id, { as: 'done', reason: 'kept' });
			timings.settle.push(performance.now() - start);
			const open = write.recordTrace(db, {
				text: `${long} series ${i}`,
				souls,
				tags: ['series:roll'],
				dueAt: '+1d',
			});
			start = performance.now();
			write.rollTrace(db, open.id, { nextDue: '+2d' });
			timings.roll.push(performance.now() - start);
		}
		assert.equal(
			statements.filter((sql) => /rebuild|CREATE VIRTUAL TABLE/i.test(sql)).length,
			0,
			'the FTS index is created and backfilled once, not on later writes',
		);
		const traces = db.prepare('SELECT count(*) AS n FROM soul_traces').get() as { n: number };
		const indexed = db.prepare('SELECT count(*) AS n FROM soul_traces_fts').get() as { n: number };
		assert.equal(indexed.n, traces.n);
		// Generous bound for loaded CI machines; a full rescan or rebuild of 2,000 traces per write exceeds it.
		for (const [name, values] of Object.entries(timings))
			assert.ok(median(values) < 50, `${name} median ${median(values).toFixed(1)} ms`);
	} finally {
		db.close();
	}
});
