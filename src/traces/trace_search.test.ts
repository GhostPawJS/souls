import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, test } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import * as read from '../read.ts';
import { createSoul } from '../souls/create_soul.ts';
import { soulsCliOptions } from '../surface/souls_cli_options.ts';
import { runToolCli } from '../surfaces/cli.ts';
import { reviewTracesToolHandler } from '../tools/review_traces_tool.ts';
import * as write from '../write.ts';

let db: SoulsDb;
let soulId: number;
beforeEach(async () => {
	db = await createInitializedSoulsDb();
	soulId = createSoul(db, { name: 'First', slug: 'first', essence: 'e', description: 'd' }).id;
});
afterEach(() => db.close());
const record = (text: string, tags: string[] = []) =>
	write.recordTrace(db, { text, tags, souls: [{ soulId, role: 'owner' }] });
const search = (query: string, options = {}) => read.searchTraces(db, { query, ...options });
function dropIndex() {
	db.exec(
		'DROP TRIGGER trace_fts_insert; DROP TRIGGER trace_fts_update; DROP TABLE soul_traces_fts',
	);
}
test('search reads never initialize fresh or legacy databases; next write backfills', () => {
	const schema = () => db.prepare('SELECT name,sql FROM sqlite_master ORDER BY name').all();
	const before = schema();
	assert.equal(search('draft').mode, 'substring');
	assert.deepEqual(schema(), before);
	const trace = record('draft legacy');
	dropIndex();
	const legacy = schema();
	assert.equal(search('DRAFT').traces[0]?.id, trace.id);
	assert.deepEqual(schema(), legacy);
	record('another fact');
	assert.equal(search('draft').mode, 'fts');
	assert.equal(search('draft').traces[0]?.id, trace.id);
});
test('record, revise, settle, compact and explicit rebuild keep search consistent', () => {
	const t = record('initial draft');
	write.reviseTrace(db, t.id, {
		text: `revised manuscript ${'context '.repeat(50)}`,
		reason: 'correction',
	});
	assert.equal(search('initial').total, 0);
	assert.equal(search('manuscript').total, 1);
	write.settleTrace(db, t.id, { as: 'done', reason: 'delivered review' });
	assert.equal(search('delivered').total, 1);
	write.compactTraces(db);
	assert.equal(search('manuscript').traces[0]?.id, t.id);
	db.exec("INSERT INTO soul_traces_fts(soul_traces_fts) VALUES('rebuild')");
	assert.equal(search('manuscript').total, 1);
});
test('bm25 ranks relevant text first and supports literal prefix terms', () => {
	const best = record('draft draft draft');
	record('draft with a long unrelated account of other work and numerous extra words');
	const page = search('draft');
	assert.equal(page.traces[0]?.id, best.id);
	assert.ok((page.traces[0]?.rank ?? 0) < (page.traces[1]?.rank ?? 0));
	assert.equal(search('dra*').total, 2);
});
test('state, tags, exclusions, prefix, soul, role and supersession filters', () => {
	const a = record('draft alpha', ['event', 'series:one']);
	const b = record('draft beta', ['event', 'belief']);
	write.settleTrace(db, b.id, { as: 'done', reason: 'complete' });
	const other = createSoul(db, { name: 'Other', essence: 'e', description: 'd' }).id;
	write.recordTrace(db, { text: 'draft other', souls: [{ soulId: other, role: 'subject' }] });
	assert.equal(
		search('draft', { soulId, state: 'open', tags: ['event', 'series:one'] }).traces[0]?.id,
		a.id,
	);
	assert.equal(search('draft', { soulId, excludeTags: ['belief'] }).total, 1);
	assert.equal(search('draft', { tagPrefix: 'series:' }).total, 1);
	assert.equal(search('draft', { soulId: other, role: 'subject' }).total, 1);
	assert.equal(search('draft', { soulId: other, role: 'owner' }).total, 0);
	write.recordTrace(db, {
		text: 'draft successor',
		supersedes: a.id,
		souls: [{ soulId, role: 'owner' }],
	});
	assert.equal(search('alpha').total, 0);
	assert.equal(search('alpha', { includeSuperseded: true }).total, 1);
});
test('pagination defaults, validation and hostile input remain safe', () => {
	for (let i = 0; i < 23; i++) record('draft');
	const page = search('draft');
	assert.equal(page.traces.length, 20);
	assert.equal(page.total, 23);
	assert.equal(page.truncated, true);
	assert.equal(page.next, 20);
	assert.equal(search('draft', { offset: 20 }).traces.length, 3);
	assert.equal(search('draft', { all: true }).truncated, false);
	assert.throws(() => search('draft', { limit: -1 }));
	for (const query of ['"', 'a OR', 'NEAR(', '*', "'; DROP", ''])
		assert.doesNotThrow(() => search(query));
	assert.equal(search('draft').total, 23);
});
test('substring fallback escapes wildcard characters and supplies null ranks', () => {
	record('A 100%_literal draft');
	record('100xxliteral draft');
	dropIndex();
	assert.equal(search('100%_LITERAL').total, 1);
	assert.equal(search('draft').traces[0]?.rank, null);
	assert.equal(search('draft').mode, 'substring');
});
test('MATCH failure falls back without changing schema', () => {
	record('draft');
	dropIndex();
	db.exec('CREATE TABLE soul_traces_fts (rowid INTEGER)');
	const before = db.prepare('SELECT name,sql FROM sqlite_master ORDER BY name').all();
	assert.equal(search('draft').mode, 'substring');
	assert.deepEqual(db.prepare('SELECT name,sql FROM sqlite_master ORDER BY name').all(), before);
});
test('tool search requires query and returns ranked results', () => {
	record('draft');
	const result = reviewTracesToolHandler(db, { view: 'search', query: 'draft' });
	assert.ok(result.ok);
	assert.equal((result.data as { mode: string }).mode, 'fts');
	assert.equal(reviewTracesToolHandler(db, { view: 'search' }).ok, false);
});
test('CLI search JSON, repeated tags, truncation and derived help', async () => {
	record('draft', ['event', 'series:one']);
	record('draft', ['event']);
	let out = '';
	let err = '';
	const sink = (f: (s: string) => void) =>
		new Writable({
			write(chunk, _encoding, done) {
				f(String(chunk));
				done();
			},
		});
	const options = {
		...soulsCliOptions,
		defaultDbPath: () => undefined,
		openContext: () => db,
		closeContext: () => {},
		stdin: Readable.from([]),
		stdout: sink((s) => {
			out += s;
		}),
		stderr: sink((s) => {
			err += s;
		}),
	};
	const code = await runToolCli(
		['trace', 'search', 'draft', '--tag', 'event', '--tag', 'series:one', '--json'],
		options,
	);
	assert.equal(code, 0, err);
	assert.equal(JSON.parse(out).data.total, 1);
	out = '';
	err = '';
	await runToolCli(['trace', 'search', 'draft', '--limit', '1', '--json'], options);
	assert.equal(JSON.parse(out).data.truncated, true);
	assert.match(err, /Results truncated/);
	out = '';
	await runToolCli(['call', 'review_traces', '--help'], options);
	assert.match(out, /search/);
});

test('unavailable FTS5 leaves no migration marker and later writes can retry', () => {
	const unavailable: SoulsDb = {
		...db,
		prepare: db.prepare.bind(db),
		close: () => {},
		exec(sql) {
			if (sql.includes('CREATE VIRTUAL TABLE soul_traces_fts'))
				throw new Error('no such module: fts5');
			db.exec(sql);
		},
	};
	const t = write.recordTrace(unavailable, {
		text: 'legacy draft',
		souls: [{ soulId, role: 'owner' }],
	});
	assert.equal(search('draft').mode, 'substring');
	assert.equal(
		db
			.prepare("SELECT name FROM sqlite_master WHERE name LIKE '%fts%' AND name LIKE '%trace%'")
			.all().length,
		0,
	);
	record('new draft');
	assert.equal(search('legacy').traces[0]?.id, t.id);
	assert.equal(search('legacy').mode, 'fts');
});
