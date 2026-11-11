import { strictEqual, throws, match } from 'node:assert/strict';
import { it } from 'node:test';
import { Writable, Readable } from 'node:stream';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInitializedSoulsDb } from './lib/test-db.ts';
import { parseCalendarTime } from './lib/parse_calendar_time.ts';
import { createSoul } from './souls/create_soul.ts';
import { resolveSoulReference } from './souls/resolve_soul_reference.ts';
import { dropShard } from './shards/drop_shard.ts';
import { listShards } from './shards/list_shards.ts';
import { pendingShardCount } from './shards/pending_shard_count.ts';
import { citeShard } from './shards/cite_shard.ts';
import { addTrait } from './traits/add_trait.ts';
import { computeTraitSignals } from './shards/compute_trait_signals.ts';
import { observeSoulToolHandler } from './tools/observe_soul_tool.ts';
import { soulsCliOptions } from './surface/souls_cli_options.ts';
import { runToolCli } from './surfaces/cli.ts';
import { openSoulsDb } from './surface/open_souls_db.ts';

it('local ISO datetimes honor explicit zones and TZ with milliseconds', () => {
 strictEqual(parseCalendarTime('2026-11-11T02:02:00.123', 'dueAt', Date.now(), 'Europe/Berlin').timestamp, Date.UTC(2026,10,11,1,2,0,123));
 const old = process.env.TZ;
 try {
 process.env.TZ = 'Asia/Tokyo';
 strictEqual(parseCalendarTime('2026-11-11T02:02:00').timestamp, Date.UTC(2026,10,10,17,2));
 strictEqual(parseCalendarTime('2026-11-11T02:02:00', 'at', Date.now(), 'UTC').timestamp, Date.UTC(2026,10,11,2,2));
 } finally { if (old === undefined) delete process.env.TZ; else process.env.TZ = old; }
 throws(() => parseCalendarTime('2026-02-30T02:00:00'));
});
it('bare UUID refs fall back to external bindings and failures suggest ext', async () => {
 const db = await createInitializedSoulsDb();
 try {
 const uuid = '12345678-1234-1234-1234-123456789abc';
 throws(() => resolveSoulReference(db, uuid), /did you mean ext:/);
 const soul = createSoul(db, { name: 'External', essence: 'E', description: 'D', externalId: uuid });
 strictEqual(resolveSoulReference(db, uuid), soul.id);
 const named = createSoul(db, { name: uuid, essence: 'E', description: 'D' });
 strictEqual(resolveSoulReference(db, uuid), named.id);
 } finally { db.close(); }
});
it('soul list alias executes and appears in help', async () => {
 const db = await createInitializedSoulsDb();
 let output = '';
 const stdout = new Writable({ write(chunk, _encoding, cb) { output += chunk; cb(); } });
 const options = { ...soulsCliOptions, stdout, stderr: stdout, stdin: Readable.from([]), openContext: () => db, closeContext: () => {} };
 try {
 createSoul(db, { name: 'Alias', essence: 'E', description: 'D' });
 strictEqual(await runToolCli(['soul','list'], options), 0);
 match(output, /Alias/);
 output = '';
 strictEqual(await runToolCli(['soul','--help'], options), 0);
 match(output, /soul list/);
 } finally { db.close(); }
});
it('withdrawn shards retain history but leave readiness and citation scoring', async () => {
 const db = await createInitializedSoulsDb();
 try {
 const soul = createSoul(db, { name: 'Evidence', essence: 'E', description: 'D' });
 const shard = () => dropShard(db, { content: 'Careful checking', source: 'test', soulIds: [soul.id] }).shard;
 const first = shard(); const second = shard();
 const trait = addTrait(db, soul.id, { principle: 'Check carefully', provenance: 'test' });
 citeShard(db, first.id, trait.id);
 strictEqual(observeSoulToolHandler(db, { action: 'retract', id: first.id, reason: 'mistaken' }).ok, true);
 strictEqual(pendingShardCount(db, soul.id), 1);
 strictEqual(computeTraitSignals(db, soul.id)[0]?.citationCount, 0);
 throws(() => citeShard(db, first.id, trait.id), /Cannot cite/);
 strictEqual(listShards(db, { status: 'all' }).length, 2);
 strictEqual(observeSoulToolHandler(db, { action: 'supersede', id: second.id, by: second.id }).ok, false);
 const replacement = shard();
 strictEqual(observeSoulToolHandler(db, { action: 'supersede', id: second.id, by: replacement.id }).ok, true);
 const history = observeSoulToolHandler(db, { action: 'history', id: second.id });
 strictEqual(history.ok, true);
 match(JSON.stringify(history), /supersededBy/);
 } finally { db.close(); }
});
it('file URI databases create the intended file and busy timeout validates', async () => {
 const dir = mkdtempSync(join(tmpdir(), 'souls-uri-'));
 try {
 const path = join(dir, 'nested', 'souls.db');
 const db = await openSoulsDb(pathToFileURL(path).href);
 db.close(); strictEqual(existsSync(path), true);
 let output = '';
 const stderr = new Writable({ write(c, _e, cb) { output += c; cb(); } });
 strictEqual(await runToolCli(['--busy-timeout', '-1', 'soul', 'list'], { ...soulsCliOptions, stderr }), 2);
 match(output, /non-negative integer/);
 } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('SQLite lock waits emit a notice and honor the configured timeout; timings are opt-in', async () => {
 const { DatabaseSync } = await import('node:sqlite');
 const dir = mkdtempSync(join(tmpdir(), 'souls-lock-'));
 const oldTimeout = process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT;
 const oldTimings = process.env.GHOSTPAW_SOULS_TIMINGS;
 const originalWrite = process.stderr.write;
 let output = '';
 process.stderr.write = ((chunk: unknown) => { output += String(chunk); return true; }) as typeof process.stderr.write;
 let locked: InstanceType<typeof DatabaseSync> | undefined;
 try {
 process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT = '30';
 delete process.env.GHOSTPAW_SOULS_TIMINGS;
 const path = join(dir, 'souls.db');
 const db = await openSoulsDb(path);
 locked = new DatabaseSync(path);
 locked.exec('BEGIN IMMEDIATE');
 const start = performance.now();
 throws(() => db.exec("INSERT INTO souls (name, essence, description, created_at, updated_at) VALUES ('Locked','E','D',1,1)"), /locked/);
 strictEqual(performance.now() - start >= 25, true);
 strictEqual(output.split('Waiting for SQLite lock').length - 1, 1);
 locked.exec('ROLLBACK');
 db.close();
 strictEqual(output.includes('timings'), false);
 process.env.GHOSTPAW_SOULS_TIMINGS = '1';
 const timed = await openSoulsDb(path); timed.close();
 match(output, /timings open=/); match(output, /timings init=/); match(output, /timings total=/);
 } finally {
 locked?.close(); process.stderr.write = originalWrite;
 if (oldTimeout === undefined) delete process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT; else process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT = oldTimeout;
 if (oldTimings === undefined) delete process.env.GHOSTPAW_SOULS_TIMINGS; else process.env.GHOSTPAW_SOULS_TIMINGS = oldTimings;
 rmSync(dir, { recursive: true, force: true });
 }
});

it('trace facade resolves due and settlement local ISO datetimes with UUID owner refs', async () => {
 const { traceSoulToolHandler } = await import('./tools/trace_soul_tool.ts');
 const { citeTrace } = await import('./traces/cite_trace.ts');
 const { withdrawShard } = await import('./shards/withdraw_shard.ts');
 const db = await createInitializedSoulsDb();
 try {
 const externalId = 'abcdef01-1234-1234-1234-123456789abc';
 const soul = createSoul(db, { name: 'Trace owner', essence: 'E', description: 'D', externalId });
 const result = traceSoulToolHandler(db, { action: 'record', text: 'Review draft', souls: [{ soul: externalId, role: 'owner' }], dueAt: '2026-11-11T02:02:00', tz: 'Europe/Berlin' });
 strictEqual(result.ok, true);
 const row = db.prepare('SELECT id, due_at FROM soul_traces').get<{ id: number; due_at: number }>();
 strictEqual(row?.due_at, Date.UTC(2026, 10, 11, 1, 2));
 strictEqual(db.prepare('SELECT soul_id FROM soul_trace_souls').get<{ soul_id: number }>()?.soul_id, soul.id);
 const settled = traceSoulToolHandler(db, { action: 'settle', id: row!.id, as: 'done', reason: 'complete', at: '2026-11-11T03:02:00', tz: 'Europe/Berlin' });
 strictEqual(settled.ok, true);
 const evidence = dropShard(db, { content: 'Retracted evidence', source: 'test', soulIds: [soul.id] }).shard;
 withdrawShard(db, evidence.id, { reason: 'correction' });
 throws(() => citeTrace(db, evidence.id, row!.id), /Cannot cite/);
 } finally { db.close(); }
});

it('shard migration adds withdrawal columns without changing old rows and is repeatable', async () => {
 const { DatabaseSync } = await import('node:sqlite');
 const { readFileSync } = await import('node:fs');
 const { initSoulsTables } = await import('./init_souls_tables.ts');
 const db = new DatabaseSync(':memory:');
 try {
 db.exec(readFileSync(new URL('./traces/fixtures/souls-0.5.1.schema.sql', import.meta.url), 'utf8').replace('CREATE TABLE sqlite_sequence(name,seq);', '').replace(/CREATE TABLE IF NOT EXISTS 'shard_fts_[^;]+;/g, ''));
 db.prepare("INSERT INTO soul_shards (content,source,created_at,updated_at) VALUES ('Old evidence','test',1,1)").run();
 initSoulsTables(db); initSoulsTables(db);
 strictEqual(db.prepare('SELECT content FROM soul_shards').get()?.content, 'Old evidence');
 strictEqual(db.prepare('SELECT withdrawn_at FROM soul_shards').get()?.withdrawn_at, null);
 } finally { db.close(); }
});

it('busy timeout and timings flags override environment for one CLI invocation', async () => {
	const db = await createInitializedSoulsDb();
	const previous = process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT;
	const previousTimings = process.env.GHOSTPAW_SOULS_TIMINGS;
	const sink = new Writable({ write(_chunk, _encoding, done) { done(); } });
	try {
		process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT = '200';
		process.env.GHOSTPAW_SOULS_TIMINGS = '0';
		strictEqual(await runToolCli(['soul', 'list', '--busy-timeout=7', '--timings'], {
			...soulsCliOptions,
			stdout: sink,
			stderr: sink,
			stdin: Readable.from([]),
			openContext: () => {
				strictEqual(process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT, '7');
				strictEqual(process.env.GHOSTPAW_SOULS_TIMINGS, '1');
				return db;
			},
			closeContext: () => {},
		}), 0);
		strictEqual(process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT, '200');
		strictEqual(process.env.GHOSTPAW_SOULS_TIMINGS, '0');
	} finally {
		db.close();
		if (previous === undefined) delete process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT;
		else process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT = previous;
		if (previousTimings === undefined) delete process.env.GHOSTPAW_SOULS_TIMINGS;
		else process.env.GHOSTPAW_SOULS_TIMINGS = previousTimings;
	}
});
