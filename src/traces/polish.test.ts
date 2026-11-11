import { deepStrictEqual, match, ok, strictEqual, throws } from 'node:assert';
import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, it } from 'node:test';
import { resolveReadiness, setSoulsConfig } from '../config.ts';
import type { SoulsDb } from '../database.ts';
import { parseCalendarTime } from '../lib/parse_calendar_time.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import * as read from '../read.ts';
import { createSoul } from '../souls/create_soul.ts';
import { soulsCliOptions } from '../surface/souls_cli_options.ts';
import { runToolCli } from '../surfaces/cli.ts';
import { traceCliHelp } from '../surfaces/trace_cli_help.ts';
import { observeSoulToolHandler } from '../tools/observe_soul_tool.ts';
import { reviewTracesTool, reviewTracesToolHandler } from '../tools/review_traces_tool.ts';
import {
	type TraceSoulInput,
	traceSoulTool,
	traceSoulToolHandler,
} from '../tools/trace_soul_tool.ts';
import * as write from '../write.ts';
import { initTraceTables } from './init_trace_tables.ts';

const NOW = Date.UTC(2026, 10, 10, 23);
const DAY = 86400000;
let db: SoulsDb;
let soulId: number;
beforeEach(async () => {
	db = await createInitializedSoulsDb();
	soulId = createSoul(db, {
		name: 'Mentor',
		slug: 'mentor',
		essence: 'e',
		description: 'd',
		now: NOW,
	}).id;
});
afterEach(() => db.close());
const record = (text = 'Review draft') =>
	write.recordTrace(db, { text, souls: [{ soulId, role: 0 }], now: NOW });
it('keeps init idempotent and rejects invalid raw trace rows', () => {
	strictEqual(read.traceTablesExist(db), false);
	initTraceTables(db);
	const schema = db.prepare('PRAGMA schema_version').get()?.schema_version;
	initTraceTables(db);
	strictEqual(db.prepare('PRAGMA schema_version').get()?.schema_version, schema);
	for (const [text, state, weight, at, reason] of [
		[' ', 0, null, null, null],
		['x', 3, null, null, null],
		['x', 0, -0.1, null, null],
		['x', 0, 1.1, null, null],
		['x', 1, null, NOW, null],
		['x', 2, null, NOW, ' '],
		['x', 1, null, null, 'done'],
	])
		throws(
			() =>
				db
					.prepare(
						'INSERT INTO soul_traces(text,state,weight,created_at,updated_at,settled_at,settle_reason) VALUES(?,?,?,1,1,?,?)',
					)
					.run(text, state, weight, at, reason),
			/CHECK/,
		);
	strictEqual(read.listTraces(db).total, 0);
});
for (const as of ['done', 'dropped'] as const)
	it(`atomically records a past ${as} event and preserves both snapshots`, () => {
		const trace = write.recordTrace(db, {
			text: 'Reviewed yesterday',
			souls: [{ soulId, role: 0 }],
			settle: { as, reason: 'Review delivered', at: NOW - DAY },
			now: NOW,
		});
		strictEqual(trace.state, as);
		strictEqual(trace.settledAt, NOW - DAY);
		const history = read.traceHistory(db, trace.id);
		deepStrictEqual(
			history.map((r) => [r.revision, r.kind, r.snapshot.state]),
			[
				[1, 'record', 'open'],
				[2, 'settle', as],
			],
		);
		deepStrictEqual(history[1]?.snapshot, trace);
		write.reviseTrace(db, trace.id, {
			text: 'Delivered comments',
			reason: 'Clarification',
			now: NOW + 1,
		});
		strictEqual(read.getTrace(db, trace.id)?.revision, 3);
		strictEqual(read.getTrace(db, trace.id)?.state, as);
	});
for (const reason of ['', '   ', '\n\t'])
	it(`rejects blank settlement reason ${JSON.stringify(reason)} without revisions`, () => {
		const trace = record();
		throws(() => write.settleTrace(db, trace.id, { as: 'done', reason }), /reason/);
		strictEqual(read.traceHistory(db, trace.id).length, 1);
		throws(
			() =>
				write.recordTrace(db, {
					text: 'Invalid',
					souls: [{ soulId, role: 0 }],
					settle: { as: 'dropped', reason },
					now: NOW,
				}),
			/reason/,
		);
		strictEqual(read.listTraces(db).total, 1);
	});
it('supports two roles for one named soul and rolls back removal of the final link', () => {
	const trace = record();
	const linked = write.linkTraceSoul(db, trace.id, soulId, 'subject');
	deepStrictEqual(
		linked.souls.map((s) => s.role),
		['owner', 'subject'],
	);
	strictEqual(linked.souls[0]?.name, 'Mentor');
	strictEqual(linked.souls[0]?.slug, 'mentor');
	throws(() => write.unlinkTraceSoul(db, trace.id, soulId, 0, { reason: '' }), /reason/);
	write.unlinkTraceSoul(db, trace.id, soulId, 0, { reason: 'Writer removed' });
	throws(
		() => write.unlinkTraceSoul(db, trace.id, soulId, 2, { reason: 'Remove last' }),
		/last soul link/,
	);
	strictEqual(read.getTrace(db, trace.id)?.souls.length, 1);
	strictEqual(read.traceHistory(db, trace.id).length, 3);
});
it('snapshots reflect every revision, tags and links, with contiguous numbers', () => {
	let trace = record();
	const check = () => {
		const history = read.traceHistory(db, trace.id);
		deepStrictEqual(history.at(-1)?.snapshot, trace);
		deepStrictEqual(
			history.map((r) => r.revision),
			Array.from({ length: history.length }, (_, i) => i + 1),
		);
	};
	check();
	trace = write.tagTrace(db, trace.id, [' Belief ']);
	check();
	trace = write.linkTraceSoul(db, trace.id, soulId, 1);
	check();
	trace = write.untagTrace(db, trace.id, ['belief'], { reason: 'Correction' });
	check();
	trace = write.unlinkTraceSoul(db, trace.id, soulId, 1, { reason: 'Correction' });
	check();
	trace = write.settleTrace(db, trace.id, { as: 'dropped', reason: 'Unsupported' });
	check();
});
it('lists all states by update time and applies independent filters and pagination', () => {
	const a = record('First promise');
	const b = record('Second belief');
	const c = record('Third promise');
	write.tagTrace(db, a.id, ['promise'], { now: NOW + 1 });
	write.reviseTrace(db, a.id, { dueAt: NOW - DAY, reason: 'Due', now: NOW + 2 });
	write.settleTrace(db, b.id, { as: 'done', reason: 'Confirmed', now: NOW + 3 });
	write.settleTrace(db, c.id, { as: 'dropped', reason: 'Cancelled', now: NOW + 4 });
	deepStrictEqual(
		read.listTraces(db).traces.map((t) => t.id),
		[c.id, b.id, a.id],
	);
	for (const state of ['open', 'done', 'dropped'] as const)
		strictEqual(read.listTraces(db, { state }).total, 1);
	strictEqual(read.listTraces(db, { tag: 'promise' }).total, 1);
	strictEqual(read.listTraces(db, { role: 1 }).total, 0);
	strictEqual(read.listTraces(db, { soulId, role: 'owner', dueBefore: NOW }).total, 1);
	strictEqual(read.listTraces(db, { query: 'PROMISE', limit: 1, offset: 1 }).traces[0]?.id, a.id);
	deepStrictEqual(
		read.dueTraces(db, { now: NOW }).map((t) => t.id),
		[a.id],
	);
});
it('due windows include overdue before upcoming and exclude undated and settled traces', () => {
	const make = (dueAt?: number) =>
		write.recordTrace(db, {
			text: 'Task',
			souls: [{ soulId, role: 0 }],
			...(dueAt === undefined ? {} : { dueAt }),
			now: NOW,
		});
	const later = make(NOW + 2 * DAY);
	const overdue = make(NOW - DAY);
	const soon = make(NOW + 3600000);
	make();
	const closed = make(NOW - DAY);
	write.settleTrace(db, closed.id, { as: 'done', reason: 'Finished', now: NOW });
	deepStrictEqual(
		read.dueTraces(db, { now: NOW, within: '12h' }).map((t) => t.id),
		[overdue.id, soon.id],
	);
	deepStrictEqual(
		read.dueTraces(db, { now: NOW, within: '3d', offset: 1, limit: 2 }).map((t) => t.id),
		[soon.id, later.id],
	);
});
it('excludes retired-only traces consistently from list, due and stats unless included', () => {
	const trace = write.recordTrace(db, {
		text: 'Old task',
		souls: [{ soulId, role: 0 }],
		dueAt: NOW - DAY,
		now: NOW,
	});
	db.prepare('UPDATE souls SET deleted_at=? WHERE id=?').run(NOW, soulId);
	strictEqual(read.listTraces(db).total, 0);
	strictEqual(read.dueTraces(db, { now: NOW }).length, 0);
	strictEqual(read.traceStats(db, { now: NOW }).weights.length, 0);
	strictEqual(read.listTraces(db, { includeRetired: true }).total, 1);
	strictEqual(read.dueTraces(db, { now: NOW, includeRetired: true })[0]?.id, trace.id);
	deepStrictEqual(read.traceStats(db, { now: NOW, includeRetired: true }).overdue, [
		{ soulId, count: 1 },
	]);
});
it('computes exact settlement counts, decay and one certainty per head', () => {
	const other = createSoul(db, { name: 'Peer', essence: 'e', description: 'd' }).id;
	const make = () =>
		write.recordTrace(db, {
			text: 'Promise',
			souls: [
				{ soulId, role: 0 },
				{ soulId: other, role: 1 },
			],
			tags: ['promise'],
			dueAt: NOW - DAY,
			createdAt: NOW - 30 * DAY,
			weight: 0.8,
			now: NOW,
		});
	const a = make();
	const b = make();
	const c = make();
	write.settleTrace(db, a.id, { as: 'done', reason: 'Kept', now: NOW });
	write.settleTrace(db, b.id, { as: 'dropped', reason: 'Cancelled', now: NOW });
	const stats = read.traceStats(db, { soulId, withSoulId: other, now: NOW });
	deepStrictEqual(stats.promiseSettleRateDetails, {
		done: 1,
		dropped: 1,
		overdueOpen: 1,
		rate: 1 / 3,
	});
	strictEqual(stats.weights.find((w) => w.id === c.id)?.weight, 0.4);
	const successor = write.recordTrace(db, {
		text: 'Correction',
		souls: [{ soulId, role: 0 }],
		supersedes: c.id,
		weight: 0.2,
		now: NOW,
	});
	const chains = read.traceStats(db, { now: NOW }).chains;
	ok(!chains.some((t) => t.id === c.id));
	strictEqual(chains.find((t) => t.id === successor.id)?.certainty, (0.2 + 0.4) / 1.5);
});
it('rejects missing supersedes targets without changing history', () => {
	const t = record();
	throws(() => write.reviseTrace(db, t.id, { supersedes: 999, reason: 'Correction' }), /not found/);
	strictEqual(read.traceHistory(db, t.id).length, 1);
});
for (const view of ['show', 'history', 'chain'] as const)
	it(`reports not_found for missing ${view} before and after trace initialization`, () => {
		for (const initialized of [false, true]) {
			if (initialized) record();
			const result = reviewTracesToolHandler(db, { view, id: 999 });
			strictEqual(result.outcome, 'error');
			if (result.outcome === 'error') strictEqual(result.error.code, 'not_found');
		}
	});
for (const action of ['settle', 'link', 'cite', 'revise'] as const)
	it(`uses a typed action-specific ${action} recovery example`, () => {
		const result = traceSoulToolHandler(db, { action, id: 'bad' } as unknown as TraceSoulInput);
		strictEqual(result.outcome, 'error');
		if (result.outcome === 'error') {
			match(result.error.message, /id.*integer/);
			const example = JSON.parse(result.error.recovery?.replace('Example input: ', '') ?? '{}');
			strictEqual(example.action, action);
			if (action === 'link') deepStrictEqual(example.souls, [{ soul: 'fox', role: 'counterpart' }]);
			if (action === 'settle') strictEqual(example.as, 'dropped');
			if (action === 'cite') strictEqual(example.shardId, 12);
		}
	});
it('uses a stats-specific recovery example and exposes MCP read-only flags', () => {
	const result = reviewTracesToolHandler(db, { view: 'stats', halfLifeDays: 'bad' } as never);
	strictEqual(result.outcome, 'error');
	if (result.outcome === 'error') {
		match(result.error.message, /halfLifeDays.*number/);
		match(result.error.recovery ?? '', /"withSoul":"fox"/);
	}
	strictEqual(reviewTracesTool.readOnly, true);
	strictEqual(traceSoulTool.readOnly, false);
});
it('has only applicable per-verb help and typed dates, with noun purposes', () => {
	for (const verb of [
		'record',
		'revise',
		'settle',
		'link',
		'unlink',
		'tag',
		'untag',
		'cite',
		'list',
		'due',
		'show',
		'history',
		'chain',
		'changed',
		'stats',
	]) {
		const help = traceCliHelp('souls', verb) ?? '';
		match(help, /Example: souls trace/);
		if (verb === 'settle') {
			ok(!help.includes('--weight'));
			match(help, /--as <done\|dropped>/);
		}
		if (verb === 'record') {
			match(help, /--weight <number 0\.\.1 or none>/);
			match(help, /--supersedes <integer trace id>/);
			match(help, /DD\.MM\.YYYY/);
		}
	}
	match(traceCliHelp('souls') ?? '', /settle\s+Close an existing trace/);
});
it('CLI record --settled produces a top-level id and two revisions', async () => {
	let output = '';
	const code = await runToolCli(
		[
			'trace',
			'record',
			'Reviewed draft',
			'--soul',
			'mentor',
			'--settled',
			'done',
			'--reason',
			'Delivered',
			'--at',
			'yesterday',
			'--json',
		],
		{
			...soulsCliOptions,
			defaultDbPath: () => undefined,
			openContext: () => db,
			closeContext: () => {},
			stdin: Readable.from([]),
			stdout: new Writable({
				write(c, _e, cb) {
					output += String(c);
					cb();
				},
			}),
		},
	);
	strictEqual(code, 0);
	const result = JSON.parse(output);
	strictEqual(result.id, 1);
	strictEqual(result.data.state, 'done');
	strictEqual(result.data.revision, 2);
});
it('CLI exits quietly on a closed stdout pipe', async () => {
	const child = spawn(
		process.execPath,
		['--experimental-strip-types', 'src/cli.ts', 'trace', 'record', '--help'],
		{ stdio: ['ignore', 'pipe', 'pipe'] },
	);
	child.stdout.destroy();
	let stderr = '';
	child.stderr.on('data', (c) => {
		stderr += String(c);
	});
	const code = await new Promise((resolve, reject) => {
		child.on('error', reject);
		child.on('close', resolve);
	});
	strictEqual(code, 0, stderr);
	ok(!stderr.includes('EPIPE'));
});
it('resolves readiness options before env before config before default', () => {
	const old = process.env.GHOSTPAW_SOULS_READINESS;
	try {
		delete process.env.GHOSTPAW_SOULS_READINESS;
		strictEqual(resolveReadiness(db), 'converged');
		setSoulsConfig(db, 'readiness', 'legacy');
		strictEqual(resolveReadiness(db), 'legacy');
		process.env.GHOSTPAW_SOULS_READINESS = 'converged';
		strictEqual(resolveReadiness(db), 'converged');
		strictEqual(resolveReadiness(db, 'legacy'), 'legacy');
	} finally {
		if (old === undefined) delete process.env.GHOSTPAW_SOULS_READINESS;
		else process.env.GHOSTPAW_SOULS_READINESS = old;
	}
});
for (const [value, expected] of [
	[NOW, NOW],
	[String(NOW), NOW],
	['2026-11-10T23:00:00Z', NOW],
	['2026-11-11T01:00:00+02:00', NOW],
	['2026-11-10', Date.UTC(2026, 10, 10)],
	['10.11.2026', Date.UTC(2026, 10, 10)],
	['today', Date.UTC(2026, 10, 11)],
	['tomorrow', Date.UTC(2026, 10, 12)],
	['yesterday', Date.UTC(2026, 10, 10)],
	['+3d', Date.UTC(2026, 10, 14)],
	['-1d', Date.UTC(2026, 10, 10)],
	['+2h', NOW + 7200000],
	['-1h', NOW - 3600000],
] as const)
	it(`accepts calendar input ${value}`, () =>
		strictEqual(parseCalendarTime(value, 'createdAt', NOW, 'Europe/Berlin').timestamp, expected));
it('calendar today respects Berlin versus UTC at midnight boundary', () => {
	strictEqual(
		parseCalendarTime('today', 'createdAt', NOW, 'UTC').timestamp,
		Date.UTC(2026, 10, 10),
	);
	strictEqual(
		parseCalendarTime('today', 'createdAt', NOW, 'Europe/Berlin').timestamp,
		Date.UTC(2026, 10, 11),
	);
	for (const value of [1234567890, 'nonsense', '2026-02-30'])
		throws(() => parseCalendarTime(value, 'dueAt', NOW), /dueAt/);
});

it('changed reports every source with camelCase timestamps and excludes old rows', () => {
	const old = write.recordTrace(db, {
		text: 'Old event',
		souls: [{ soulId, role: 0 }],
		now: NOW - DAY,
	});
	const t = record();
	write.dropShard(db, {
		content: 'Recent observation',
		source: 'journal',
		soulIds: [soulId],
		now: NOW,
	});
	db.prepare(
		"INSERT INTO soul_revisions(entity,entity_id,soul_id,new_text,created_at) VALUES('essence',?,?,?,?)",
	).run(soulId, soulId, 'Refined', NOW);
	db.prepare(
		'INSERT INTO soul_levels(soul_id,level,essence_before,essence_after,created_at) VALUES(?,2,?,?,?)',
	).run(soulId, 'Before', 'After', NOW);
	db.prepare('UPDATE souls SET last_attuned_at=? WHERE id=?').run(NOW, soulId);
	const due = write.recordTrace(db, {
		text: 'Just due',
		souls: [{ soulId, role: 0 }],
		dueAt: NOW - 1,
		now: NOW - DAY,
	});
	const report = read.changedSince(db, NOW - 100, { now: NOW });
	deepStrictEqual(
		Object.keys(report).sort(),
		[
			'total',
			'traces',
			'truncated',
			'shards',
			'revisions',
			'levelUps',
			'attunements',
			'newlyDue',
			'next',
			'cursor',
			'since',
		].sort(),
	);
	deepStrictEqual(
		report.traces.map((r) => r.id),
		[t.id],
	);
	ok(!report.traces.some((r) => r.id === old.id));
	strictEqual(report.shards.length, 1);
	strictEqual(report.attunements[0]?.lastAttunedAt, NOW);
	const data = report as unknown as {
		revisions: { createdAt: number }[];
		levelUps: { createdAt: number }[];
	};
	strictEqual(data.revisions[0]?.createdAt, NOW);
	strictEqual(data.levelUps[0]?.createdAt, NOW);
	strictEqual(report.newlyDue[0]?.id, due.id);
	strictEqual(report.newlyDue[0]?.dueAt, NOW - 1);
	strictEqual(report.since, NOW - 100);
	strictEqual(report.cursor, NOW);
	const noSnake = (value: unknown): void => {
		if (Array.isArray(value)) for (const item of value) noSnake(item);
		else if (value && typeof value === 'object')
			for (const [key, item] of Object.entries(value)) {
				ok(!key.includes('_'), key);
				noSnake(item);
			}
	};
	noSnake(report);
	strictEqual(read.changedSince(db, report.cursor, { now: NOW }).traces.length, 0);
});
it('multi-link failure rolls back the entire tool transaction and revisions', () => {
	const t = record();
	const result = traceSoulToolHandler(db, {
		action: 'link',
		id: t.id,
		souls: [
			{ soul: soulId, role: 'subject' },
			{ soul: 999, role: 'counterpart' },
		],
	});
	strictEqual(result.ok, false);
	deepStrictEqual(read.getTrace(db, t.id), t);
	strictEqual(read.traceHistory(db, t.id).length, 1);
});
it('caps chain depth and refuses longer chains without partial writes', () => {
	initTraceTables(db);
	const insert = db.prepare(
		'INSERT INTO soul_traces(id,text,created_at,updated_at,supersedes) VALUES(?,?,?,?,?)',
	);
	for (let i = 1; i <= 1001; i++) insert.run(i, 'Belief', NOW, NOW, i === 1 ? null : i - 1);
	throws(
		() =>
			write.recordTrace(db, {
				text: 'Too deep',
				souls: [{ soulId, role: 0 }],
				supersedes: 1001,
				now: NOW,
			}),
		/depth/,
	);
	strictEqual(db.prepare('SELECT count(*) AS n FROM soul_traces').get()?.n, 1001);
	strictEqual(read.traceChain(db, 1001).traces.length, 1001);
});
for (const secret of [
	'password=abc',
	'ghp_abcdefgh',
	'-----BEGIN RSA PRIVATE KEY-----',
	'sk-12345678901234567890',
	'AKIA1234567890123456',
	'xoxb-abc',
	`npm_${'a'.repeat(36)}`,
])
	it(`rejects credential pattern in settlement reason ${secret.slice(0, 12)}`, () => {
		const t = record();
		throws(() => write.settleTrace(db, t.id, { as: 'done', reason: secret }), /credential/);
		strictEqual(read.traceHistory(db, t.id).length, 1);
		const result = observeSoulToolHandler(db, {
			action: 'drop',
			content: secret,
			source: 'journal',
			soulIds: [soulId],
			now: NOW,
		});
		ok(result.ok);
		ok(JSON.stringify(result).includes('credential'));
	});
it('trace summaries use natural verbs and report counts', () => {
	const result = traceSoulToolHandler(db, {
		action: 'record',
		text: 'Task',
		souls: [{ soul: soulId, role: 0 }],
	});
	ok(result.ok);
	strictEqual(result.summary, 'Recorded trace #1.');
	strictEqual(
		traceSoulToolHandler(db, { action: 'settle', id: 1, as: 'done', reason: 'Delivered' }).summary,
		'Settled trace #1 as done.',
	);
	strictEqual(
		traceSoulToolHandler(db, { action: 'revise', id: 1, text: 'Reviewed', reason: 'Clarification' })
			.summary,
		'Revised trace #1.',
	);
	strictEqual(reviewTracesToolHandler(db, { view: 'list' }).summary, '1 trace.');
	strictEqual(reviewTracesToolHandler(db, { view: 'due' }).summary, '0 due or overdue traces.');
	match(
		reviewTracesToolHandler(db, { view: 'changed', since: NOW - 1, now: NOW + DAY }).summary,
		/^\d+ changes? since 2026-11-10T22:59:59\.999Z\.$/,
	);
});
it('superseded trace citations no longer merge readiness clusters', async () => {
	const { checkCrystallizationForSoul } = await import(
		'../shards/check_crystallization_for_soul.ts'
	);
	const contents = [
		'Database migration checks preserve rows',
		'Practiced piano every evening',
		'The quick brown fox jumps over a dog',
	];
	const t = record();
	for (let i = 0; i < contents.length; i++)
		write.dropShard(db, {
			content: contents[i] as string,
			source: i === 0 ? 'a' : 'b',
			soulIds: [soulId],
			traceIds: [t.id],
			now: NOW - (3 - i) * DAY,
		});
	const backed = checkCrystallizationForSoul(db, soulId, { now: NOW });
	strictEqual(backed?.traceBackedCount, 3);
	write.recordTrace(db, {
		text: 'Corrected evidence',
		souls: [{ soulId, role: 0 }],
		supersedes: t.id,
		now: NOW,
	});
	const superseded = checkCrystallizationForSoul(db, soulId, { now: NOW });
	strictEqual(superseded?.traceBackedCount, 0);
	strictEqual(superseded?.ready, false);
});
it('CLI rendering adds open traces only when explicitly requested', async () => {
	let output = '';
	const options = {
		...soulsCliOptions,
		defaultDbPath: () => undefined,
		openContext: () => db,
		closeContext: () => {},
		stdin: Readable.from([]),
		stdout: new Writable({
			write(c, _e, cb) {
				output += String(c);
				cb();
			},
		}),
	};
	strictEqual(await runToolCli(['render', 'mentor'], options), 0);
	const before = output;
	record();
	output = '';
	strictEqual(await runToolCli(['render', 'mentor'], options), 0);
	strictEqual(output, before);
	output = '';
	strictEqual(await runToolCli(['render', 'mentor', '--traces', 'open'], options), 0);
	match(output, /Open commitments/);
	match(output, /Review draft/);
});
it('nested validation names the field and expected type with the matching example', () => {
	for (const input of [
		{
			action: 'record',
			text: 'Event',
			souls: [{ soul: soulId, role: 0 }],
			settle: { as: 'done', reason: 12 },
		},
		{ action: 'link', id: 4, souls: [{ soul: true, role: 'counterpart' }] },
		{ action: 'revise', id: 4, reason: 'Changed', weight: 'heavy' },
	]) {
		const result = traceSoulToolHandler(db, input as never);
		strictEqual(result.outcome, 'error');
		if (result.outcome === 'error') {
			match(result.error.message, /expected/);
			match(
				result.error.message,
				input.action === 'record'
					? /settle.reason/
					: input.action === 'link'
						? /souls\[0\].soul/
						: /weight/,
			);
			match(result.error.recovery ?? '', new RegExp(`"action":"${input.action}"`));
		}
	}
});
it('opening a fresh file database leaves trace schema absent until the first write', async () => {
	const { mkdtempSync, rmSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const { openSoulsDb } = await import('../surface/open_souls_db.ts');
	const dir = mkdtempSync(join(tmpdir(), 'trace-fresh-'));
	const fresh = await openSoulsDb(join(dir, 'souls.db'));
	try {
		strictEqual(read.traceTablesExist(fresh), false);
		read.changedSince(fresh, NOW, { now: NOW });
		strictEqual(read.traceTablesExist(fresh), false);
		const s = createSoul(fresh, { name: 'S', essence: 'e', description: 'd' });
		write.recordTrace(fresh, { text: 'Event', souls: [{ soulId: s.id, role: 2 }] });
		strictEqual(read.traceTablesExist(fresh), true);
	} finally {
		fresh.close();
		rmSync(dir, { recursive: true, force: true });
	}
});
