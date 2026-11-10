import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, test } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import * as read from '../read.ts';
import { createSoul } from '../souls/create_soul.ts';
import { soulsCliOptions } from '../surface/souls_cli_options.ts';
import { runToolCli } from '../surfaces/cli.ts';
import { reviewTracesToolHandler } from '../tools/review_traces_tool.ts';
import { traceSoulToolHandler } from '../tools/trace_soul_tool.ts';
import * as write from '../write.ts';
import { time } from './trace_time.ts';
import type { RecordTraceInput } from './types.ts';

const NOW = Date.UTC(2026, 10, 10, 12);
let db: SoulsDb;
let soulId: number;
let other: number;
beforeEach(async () => {
	db = await createInitializedSoulsDb();
	soulId = createSoul(db, { name: 'First', slug: 'first', essence: 'e', description: 'd' }).id;
	other = createSoul(db, { name: 'Second', slug: 'second', essence: 'e', description: 'd' }).id;
});
afterEach(() => db.close());
const record = (input: Partial<RecordTraceInput> = {}) =>
	write.recordTrace(db, {
		text: 'Review draft',
		souls: [{ soulId, role: 'owner' }],
		now: NOW,
		...input,
	});
async function cli(args: string[], stdin = '') {
	let out = '';
	let err = '';
	const sink = (f: (s: string) => void) =>
		new Writable({
			write(chunk, _encoding, done) {
				f(String(chunk));
				done();
			},
		});
	const code = await runToolCli([...args, '--json'], {
		...soulsCliOptions,
		defaultDbPath: () => undefined,
		openContext: () => db,
		closeContext: () => {},
		stdin: Readable.from([stdin]),
		stdout: sink((s) => {
			out += s;
		}),
		stderr: sink((s) => {
			err += s;
		}),
	});
	return { code, out, err };
}
test('1: CLI creation and settlement times match the tool independently', async () => {
	const result = await cli([
		'trace',
		'record',
		'Past event',
		'--soul',
		'first',
		'--created-at',
		'2026-11-01',
		'--at',
		'2026-11-02',
		'--settled',
		'done',
		'--reason',
		'delivered',
		'--tz',
		'Europe/Berlin',
	]);
	assert.equal(result.code, 0, result.err);
	const value = JSON.parse(result.out);
	const tool = traceSoulToolHandler(db, {
		action: 'record',
		text: 'Past event',
		souls: [{ soul: 'first', role: 'owner' }],
		createdAt: '2026-11-01',
		at: '2026-11-02',
		settle: { as: 'done', reason: 'delivered', at: '2026-11-02' },
		tz: 'Europe/Berlin',
	});
	assert.ok(tool.ok);
	assert.equal(value.data.createdAt, tool.data.createdAt);
	assert.equal(value.data.settledAt, tool.data.settledAt);
	assert.notEqual(value.data.createdAt, value.data.settledAt);
	const onlyAt = await cli([
		'trace',
		'record',
		'Current fact',
		'--soul',
		'first',
		'--at',
		'2026-01-01',
	]);
	assert.equal(onlyAt.code, 0, onlyAt.err);
	assert.ok(JSON.parse(onlyAt.out).data.createdAt > Date.UTC(2026, 0, 2));
});
test('2: trace date resolver and CLI honor winter and summer local midnight', () => {
	for (const field of ['at', 'createdAt', 'dueBefore', 'since']) {
		assert.equal(time('2026-11-10', field, { tz: 'Europe/Berlin' }), Date.UTC(2026, 10, 9, 23));
		assert.equal(time('2026-07-10', field, { tz: 'Europe/Berlin' }), Date.UTC(2026, 6, 9, 22));
	}
	// A bare due day means the end of that local day.
	for (const field of ['dueAt', 'nextDue']) {
		assert.equal(
			time('2026-11-10', field, { tz: 'Europe/Berlin' }),
			Date.UTC(2026, 10, 10, 23) - 1,
		);
		assert.equal(time('2026-07-10', field, { tz: 'Europe/Berlin' }), Date.UTC(2026, 6, 10, 22) - 1);
		assert.equal(time('2026-11-10', field, { tz: 'UTC' }), Date.UTC(2026, 10, 10, 23, 59, 59, 999));
	}
	const dir = mkdtempSync(join(tmpdir(), 'trace-zone-'));
	try {
		const path = join(dir, 'zone.db');
		const script = `import { runToolCli } from './src/surfaces/cli.ts'; import { soulsCliOptions } from './src/surface/souls_cli_options.ts'; process.exitCode = await runToolCli(process.argv.slice(1), soulsCliOptions);`;
		const run = (args: string[]) => {
			const outFile = join(dir, 'stdout');
			const errFile = join(dir, 'stderr');
			const stdout = openSync(outFile, 'w');
			const stderr = openSync(errFile, 'w');
			try {
				const child = spawnSync(
					process.execPath,
					[
						'--experimental-strip-types',
						'--input-type=module',
						'-e',
						script,
						...args,
						'--db',
						path,
						'--json',
					],
					{ env: { ...process.env, TZ: 'Europe/Berlin' }, stdio: ['ignore', stdout, stderr] },
				);
				return {
					...child,
					stdout: readFileSync(outFile, 'utf8'),
					stderr: readFileSync(errFile, 'utf8'),
				};
			} finally {
				closeSync(stdout);
				closeSync(stderr);
			}
		};
		const soul = run(['soul', 'create', 'First', '--essence', 'e', '--description', 'd']);
		assert.ifError(soul.error);
		assert.equal(soul.status, 0, soul.stderr);
		const result = run([
			'trace',
			'record',
			'Zoned',
			'--soul',
			'First',
			'--created-at',
			'2026-11-10',
			'--due',
			'2026-07-10',
		]);
		assert.ifError(result.error);
		assert.equal(result.status, 0, result.stderr);
		assert.ok(
			result.stdout.length,
			JSON.stringify({ stderr: result.stderr, status: result.status }),
		);
		assert.equal(JSON.parse(result.stdout).data.createdAt, Date.UTC(2026, 10, 9, 23));
		assert.equal(JSON.parse(result.stdout).data.dueAt, Date.UTC(2026, 6, 10, 22) - 1);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
test('3: stats bound heads and separate roles and tagged promise rates', () => {
	const souls = [
		{ soulId, role: 0 as const },
		{ soulId: other, role: 1 as const },
		{ soulId: other, role: 2 as const },
	];
	record({ souls, tags: ['promise'], dueAt: NOW - 1, settle: { as: 'done', reason: 'delivered' } });
	record({ souls, tags: ['belief'], dueAt: NOW - 1 });
	for (let i = 0; i < 22; i++) record();
	const stats = read.traceStats(db, { soulId, withSoulId: other, now: NOW });
	assert.equal(stats.chains.length, 20);
	assert.equal(stats.headsTotal, 24);
	assert.equal(stats.headsTruncated, true);
	assert.equal(stats.weightsTruncated, true);
	assert.equal(stats.weights.length, stats.chains.length);
	assert.equal(stats.weightsTotal, stats.headsTotal);
	assert.equal(stats.promiseSettleRate, 0.5);
	assert.equal(stats.promiseSettleRateTagged, 1);
	const all = read.traceStats(db, { all: true, now: NOW });
	assert.equal(all.chains.length, 24);
	assert.deepEqual(
		all.overdueBySoul.find((r) => r.soulId === other),
		{ soulId: other, count: 1, owner: 0, counterpart: 1, subject: 1 },
	);
	assert.deepEqual(all.overdue, [{ soulId, count: 1 }]);
	assert.equal(read.traceStats(db, { limit: 1, now: NOW }).chains.length, 1);
});
test('4: excluded categories filter list, due and stats through CLI and tool', async () => {
	record({ tags: ['belief'], dueAt: NOW - 1 });
	const kept = record({ tags: ['promise'], dueAt: NOW - 1 });
	assert.deepEqual(
		read.listTraces(db, { excludeTags: ['belief'] }).traces.map((t) => t.id),
		[kept.id],
	);
	assert.equal(read.dueTraces(db, { excludeTags: ['belief'], now: NOW }).length, 1);
	assert.equal(read.traceStats(db, { excludeTags: ['belief'], now: NOW }).overdue[0]?.count, 1);
	const result = await cli(['trace', 'list', '--state', 'open', '--exclude-tag', 'belief']);
	assert.equal(result.code, 0, result.err);
	assert.equal(JSON.parse(result.out).data.total, 1);
	assert.ok(reviewTracesToolHandler(db, { view: 'list', excludeTags: ['belief'] }).ok);
});
test('5: pagination reports truncation, all removes the cap and tag prefixes are literal', async () => {
	for (let i = 0; i < 103; i++) record({ tags: ['series:weekly'], dueAt: NOW - 1 });
	record({ tags: ['unrelated'] });
	const list = read.listTraces(db, { tag: 'series:*' });
	assert.equal(list.total, 103);
	assert.equal(list.traces.length, 100);
	assert.equal(list.truncated, true);
	assert.equal(list.next, 100);
	assert.equal(read.listTraces(db, { tagPrefix: 'series:', all: true }).traces.length, 103);
	assert.equal(read.listTraces(db, { tagPrefix: 'series:', offset: 100 }).traces.length, 3);
	assert.equal(read.changedSince(db, NOW - 1, { now: NOW, offset: 100 }).traces.length, 4);
	for (const verb of ['list', 'due', 'changed']) {
		const result = await cli([
			'trace',
			verb,
			...(verb === 'changed' ? ['--since', String(NOW - 1)] : []),
			'--limit',
			'2',
		]);
		assert.equal(result.code, 0, result.err);
		assert.match(result.err, /truncated/i);
		const parsed = JSON.parse(result.out);
		assert.equal((verb === 'due' ? parsed : parsed.data).truncated, true);
	}
});
test('5: JSONL batches from files and stdin are atomic and identify bad lines', async () => {
	const item = { text: 'Batch fact', souls: [{ soul: 'first', role: 'owner' }] };
	const before = read.listTraces(db).total;
	const failed = await cli(
		['trace', 'record', '--batch', '-'],
		`${JSON.stringify(item)}\n${JSON.stringify({ ...item, souls: [{ soul: 'missing', role: 'owner' }] })}\n`,
	);
	assert.notEqual(failed.code, 0);
	assert.match(failed.out, /Line 2/);
	assert.equal(read.listTraces(db).total, before);
	const good = await cli(
		['trace', 'record', '--batch', '-'],
		`${JSON.stringify(item)}\n${JSON.stringify(item)}\n`,
	);
	assert.equal(good.code, 0, good.err);
	assert.equal(JSON.parse(good.out).length, 2);
	const dir = mkdtempSync(join(tmpdir(), 'trace-batch-'));
	try {
		const file = join(dir, 'batch.jsonl');
		writeFileSync(file, JSON.stringify(item));
		const result = await cli(['trace', 'record', '--batch', file]);
		assert.equal(result.code, 0, result.err);
		assert.equal(JSON.parse(result.out).length, 1);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
test('6: roll carries fields and rolls settlement back if recording fails', async () => {
	const old = record({ text: 'Repeat', tags: ['promise'], weight: 0.8 });
	assert.throws(() => write.rollTrace(db, old.id, { nextDue: 'invalid', now: NOW }), /dueAt/);
	assert.equal(read.getTrace(db, old.id)?.state, 'open');
	assert.equal(read.traceHistory(db, old.id).length, 1);
	const result = await cli([
		'trace',
		'roll',
		String(old.id),
		'--next-due',
		'2026-11-12',
		'--tz',
		'UTC',
	]);
	assert.equal(result.code, 0, result.err);
	const next = JSON.parse(result.out).data;
	assert.equal(next.supersedes, old.id);
	assert.equal(next.text, old.text);
	assert.deepEqual(next.tags, old.tags);
	assert.equal(next.weight, old.weight);
	assert.equal(next.state, 'open');
	assert.equal(read.getTrace(db, old.id)?.settleReason, 'rolled forward');
	assert.throws(() => write.rollTrace(db, old.id, { nextDue: NOW }), /settled|successor/);
});
test('7: compact preserves every history byte and append-only protection, dry run is read-only', () => {
	const old = record({ text: 'Long text '.repeat(220) });
	write.reviseTrace(db, old.id, { reason: 'date moved', dueAt: NOW + 1000, now: NOW + 1 });
	// Simulate legacy full snapshots using the same explicit maintenance transaction.
	db.exec('BEGIN IMMEDIATE; DROP TRIGGER trace_revision_no_update');
	for (const revision of read.traceHistory(db, old.id))
		db.prepare('UPDATE soul_trace_revisions SET snapshot=? WHERE id=?').run(
			JSON.stringify(revision.snapshot),
			revision.id,
		);
	db.exec(
		"CREATE TRIGGER trace_revision_no_update BEFORE UPDATE ON soul_trace_revisions BEGIN SELECT RAISE(ABORT, 'Trace revisions are append-only'); END; COMMIT",
	);
	const before = JSON.stringify(read.traceHistory(db, old.id));
	const rawBefore = db.prepare('SELECT snapshot FROM soul_trace_revisions').all();
	const dry = write.compactTraces(db, { dryRun: true });
	assert.ok(dry.bytesAfter < dry.bytesBefore);
	assert.deepEqual(db.prepare('SELECT snapshot FROM soul_trace_revisions').all(), rawBefore);
	const compact = write.compactTraces(db);
	assert.ok(compact.bytesAfter < compact.bytesBefore);
	assert.equal(JSON.stringify(read.traceHistory(db, old.id)), before);
	assert.equal(db.prepare('SELECT count(*) AS n FROM soul_trace_texts').get<{ n: number }>()?.n, 1);
	assert.throws(() => db.exec('UPDATE soul_trace_revisions SET reason=NULL'), /append-only/);
});
test('8: merges consume all parents once, traverse branches and reject cycles atomically', async () => {
	const a = record();
	const b = record();
	const result = await cli([
		'trace',
		'record',
		'Merged',
		'--soul',
		'first',
		'--supersedes',
		String(a.id),
		'--supersedes',
		String(b.id),
	]);
	assert.equal(result.code, 0, result.err);
	const merged = JSON.parse(result.out).data;
	assert.equal(merged.supersedes, a.id);
	assert.deepEqual(merged.mergedFrom, [b.id]);
	assert.deepEqual(
		new Set(read.traceChain(db, b.id).traces.map((t) => t.id)),
		new Set([merged.id, a.id, b.id]),
	);
	assert.equal(read.listTraces(db).total, 1);
	const separate = record();
	const called = await cli([
		'call',
		'trace_soul',
		JSON.stringify({
			action: 'record',
			text: 'Scalar parent',
			souls: [{ soul: soulId, role: 0 }],
			supersedes: separate.id,
		}),
	]);
	assert.equal(called.code, 0, called.err);
	assert.equal(JSON.parse(called.out).data.supersedes, separate.id);
	assert.throws(() => record({ supersedes: b.id }), /successor/);
	assert.throws(
		() => write.reviseTrace(db, a.id, { supersedes: merged.id, reason: 'cycle' }),
		/cycle/,
	);
	assert.equal(read.getTrace(db, a.id)?.supersedes, null);
});
test('9: write envelopes retain id and add matching data', async () => {
	const result = await cli(['trace', 'record', 'Envelope', '--soul', 'first']);
	assert.equal(result.code, 0, result.err);
	const value = JSON.parse(result.out);
	assert.equal(value.id, value.data.id);
	assert.equal(value.text, value.data.text);
});
test('10: call help lists tools or fields and examples with exit zero', async () => {
	for (const args of [
		['call', '--help'],
		['call', '-h'],
		['call', 'trace_soul', '--help'],
	]) {
		const result = await cli(args);
		assert.equal(result.code, 0, result.err);
		assert.match(result.out, /Usage:/);
		assert.match(result.out, /trace_soul/);
		if (args.length === 3) {
			assert.match(result.out, /createdAt/);
			assert.match(result.out, /Example:/);
		}
	}
});
test('11: imports preserve historical update time and do not appear beyond an old cursor', async () => {
	const result = await cli([
		'trace',
		'record',
		'Imported',
		'--soul',
		'first',
		'--import',
		'--created-at',
		'2026-01-01',
		'--updated-at',
		'2026-02-01',
		'--tz',
		'UTC',
	]);
	assert.equal(result.code, 0, result.err);
	const trace = JSON.parse(result.out).data;
	assert.equal(trace.updatedAt, Date.UTC(2026, 1, 1));
	assert.equal(trace.createdAt, Date.UTC(2026, 0, 1));
	assert.equal(read.traceHistory(db, trace.id)[0]?.reason, 'import');
	const batch = traceSoulToolHandler(db, {
		action: 'record_batch',
		items: [
			{
				action: 'record',
				text: 'Older',
				souls: [{ soul: soulId, role: 0 }],
				import: true,
				createdAt: Date.UTC(2026, 0, 1),
			},
		],
	});
	assert.ok(batch.ok);
	assert.equal(batch.data[0]?.updatedAt, Date.UTC(2026, 0, 1));
	assert.equal(read.changedSince(db, Date.UTC(2026, 2, 1), { now: NOW }).traces.length, 0);
	const imported = await cli(
		['trace', 'record', '--batch', '-', '--import', '--updated-at', '2026-03-01', '--tz', 'UTC'],
		JSON.stringify({
			text: 'Batch imported',
			createdAt: '2026-01-01',
			souls: [{ soul: 'first', role: 'owner' }],
		}),
	);
	assert.equal(imported.code, 0, imported.err);
	assert.equal(JSON.parse(imported.out)[0].updatedAt, Date.UTC(2026, 2, 1));
	assert.equal(read.changedSince(db, 'now', { now: '2026-11-10T12:00:00Z' }).since, NOW);
});

test('7/8: reads of a legacy trace store create no additive tables; a write migrates lazily', () => {
	const old = record();
	db.exec('DROP TABLE soul_trace_merges; DROP TABLE soul_trace_texts');
	const schema = JSON.stringify(
		db.prepare('SELECT name,sql FROM sqlite_master ORDER BY name').all(),
	);
	read.getTrace(db, old.id);
	read.traceHistory(db, old.id);
	read.traceChain(db, old.id);
	read.listTraces(db);
	read.dueTraces(db);
	read.changedSince(db, NOW, { now: NOW });
	read.traceStats(db);
	assert.equal(
		JSON.stringify(db.prepare('SELECT name,sql FROM sqlite_master ORDER BY name').all()),
		schema,
	);
	write.reviseTrace(db, old.id, { text: 'Long '.repeat(500), reason: 'expanded' });
	assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name='soul_trace_texts'").get());
	assert.equal(read.traceHistory(db, old.id)[1]?.snapshot.text, 'Long '.repeat(500).trim());
});
test('7: failed compaction restores revision protection in the same transaction', () => {
	const old = record({ text: 'Original '.repeat(100) });
	const before = JSON.stringify(read.traceHistory(db, old.id));
	db.exec(
		"CREATE TRIGGER reject_compact BEFORE UPDATE ON soul_trace_revisions BEGIN SELECT RAISE(ABORT, 'forced compaction failure'); END",
	);
	assert.throws(() => write.compactTraces(db), /forced compaction failure/);
	assert.equal(JSON.stringify(read.traceHistory(db, old.id)), before);
	db.exec('DROP TRIGGER reject_compact');
	assert.throws(() => db.exec('UPDATE soul_trace_revisions SET reason=NULL'), /append-only/);
});
