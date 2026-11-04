import { deepEqual, equal, match, ok } from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { getRevisionHistory } from '../revisions.ts';
import { createSoul } from '../souls/create_soul.ts';
import { updateSoul } from '../souls/update_soul.ts';
import { runToolCli } from '../surfaces/cli.ts';
import { manageSoulToolHandler } from '../tools/manage_soul_tool.ts';
import { refineSoulToolHandler } from '../tools/refine_soul_tool.ts';
import { addTrait } from '../traits/add_trait.ts';
import { reviseTrait } from '../traits/revise_trait.ts';
import { resolveSoulsDbPath } from './resolve_souls_db_path.ts';
import { soulsCliOptions } from './souls_cli_options.ts';

async function fixture() {
	const db = await createInitializedSoulsDb();
	const soul = createSoul(db, {
		name: 'Reviewer',
		essence: 'Read carefully',
		description: 'Review',
		externalId: 'one',
	});
	const invoke = async (args: string[], input = '', tty = false) => {
		let out = '',
			err = '',
			opens = 0;
		const sink = (write: (s: string) => void) =>
			Object.assign(
				new Writable({
					write(chunk, _enc, cb) {
						write(String(chunk));
						cb();
					},
				}),
				{ isTTY: tty },
			);
		const options = {
			...soulsCliOptions,
			commands: {
				...soulsCliOptions.commands,
				mcp: () => {
					opens++;
				},
			},
			openContext: () => {
				opens++;
				return db;
			},
			closeContext: () => {},
			stdin: Readable.from([input]),
			stdout: sink((s) => {
				out += s;
			}),
			stderr: sink((s) => {
				err += s;
			}),
		};
		const code = await runToolCli(args, options);
		return { code, out, err, opens };
	};
	return { db, soul, invoke };
}

test('host flags work in every position and review help preserves generated help', async () => {
	const { db, invoke } = await fixture();
	try {
		for (const prefix of [
			['--db', 'x'],
			['--db=x'],
			['--json', '--quiet', '--no-color', '--compact', '--db', 'x'],
		]) {
			equal((await invoke([...prefix, 'config', 'get', 'strict'])).code, 0);
			equal((await invoke([...prefix, 'render', '1'])).code, 0);
			equal((await invoke([...prefix, 'report', '--expect-ids', '@-'], 'one')).code, 0);
			equal((await invoke([...prefix, 'review', '1'])).code, 0);
		}
		for (const flag of ['--help', '-h']) {
			const actual = await invoke(['review', flag]);
			equal(
				actual.out,
				`Usage: ghostpaw-souls review <view> [flags]
List all active souls, run the maintenance cycle, or check crystallization readiness.

Positionals:
  view  string (list|maintenance|readiness)  list: all active souls, maintenance: run fade + readiness cycle, readiness: crystallization status only.
Flags:
  --view  string (list|maintenance|readiness)  list: all active souls, maintenance: run fade + readiness cycle, readiness: crystallization status only. (required)
`,
			);
			equal(actual.opens, 0);
			ok(!actual.out.includes('Host commands:'));
			match(actual.out, /string \(list\|maintenance\|readiness\)/);
			ok(!actual.out.includes('--soul-id'));
			ok(!actual.out.includes('history'));
		}
	} finally {
		db.close();
	}
});

test('diff stdin matches file exits and file failures are usage errors without OS details', async () => {
	const { db, invoke } = await fixture();
	const dir = mkdtempSync(join(tmpdir(), 'souls-diff-'));
	const file = join(dir, 'prompt');
	try {
		equal((await invoke(['render', '1', '--into', file, '--db=x'])).code, 0);
		const text = readFileSync(file, 'utf8');
		for (const same of [true, false]) {
			const value = same ? text : text.replace('Read carefully', 'Different');
			writeFileSync(file, value);
			equal((await invoke(['--db=x', 'diff', '1', '--against', file])).code, same ? 0 : 1);
			equal((await invoke(['--db=x', 'diff', '1', '--against', '-'], value)).code, same ? 0 : 1);
		}
		for (const path of [join(dir, 'missing'), dir]) {
			const result = await invoke(['--db=x', 'diff', '1', '--against', path]);
			equal(result.code, 2);
			equal(result.err, `Cannot read file for --against: ${path}\n`);
		}
		const absent = join(dir, 'missing', 'prompt');
		const result = await invoke(['--db=x', 'render', '1', '--into', absent]);
		equal(result.code, 2);
		equal(result.err, `Cannot read file for --against: ${absent}\n`);
	} finally {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	}
});

test('shard add aliases drop and batch accepts arrays, JSON Lines, stdin and per-item duplicates', async () => {
	const { db, invoke } = await fixture();
	const dir = mkdtempSync(join(tmpdir(), 'souls-batch-'));
	const file = join(dir, 'shards');
	try {
		const item = {
			content: 'Read intent',
			source: 'chat',
			soulIds: [1],
			tags: ['review'],
			sealed: false,
			occurredAt: 1234,
			idempotencyKey: 'one',
			ref: 'issue:1',
		};
		const shard = await invoke([
			'--db=x',
			'shard',
			'add',
			item.content,
			'--source',
			'chat',
			'--soul-ids',
			'1',
			'--occurred-at',
			'1234',
			'--idempotency-key',
			'single',
			'--ref',
			'issue:single',
		]);
		equal(shard.code, 0);
		equal(JSON.parse(shard.out).data.shard.ref, 'issue:single');
		for (const content of [
			JSON.stringify([item]),
			JSON.stringify(item),
			`${JSON.stringify(item)}\n${JSON.stringify({ ...item, idempotencyKey: 'two' })}\n`,
		]) {
			writeFileSync(file, content);
			for (const args of [
				['shard', 'drop-batch', '--shards', `@${file}`],
				['shard', 'add', '--batch', `@${file}`],
				['shard', 'add', '--batch', '@-'],
				['shard', 'drop-batch', '--shards', JSON.stringify([item])],
			]) {
				const result = await invoke(['--db=x', ...args], content);
				equal(result.code, 0, result.err);
				const repeated = await invoke(['--db=x', ...args], content);
				equal(repeated.code, 0, repeated.err);
				ok(
					JSON.parse(repeated.out).data.result.results.every(
						(r: { duplicate: boolean }) => r.duplicate,
					),
				);
				const record = JSON.parse(result.out).data.result.shards[0];
				equal(record.ref, item.ref);
				equal(record.occurredAt, 1234);
			}
		}
		equal(db.prepare('SELECT COUNT(*) AS n FROM soul_shards').get()?.n, 3);
		match((await invoke(['shard', '--help'])).out, /shard add/);
		const literal = await invoke(['--db=x', 'shard', 'drop-batch', '--shards', '@@missing']);
		equal(literal.code, 2);
		ok(!literal.err.includes('Cannot read'));
	} finally {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	}
});

test('external id create and update conflicts exit four and preserve bindings', async () => {
	const { db, invoke } = await fixture();
	try {
		const expected = 'External id "one" is already bound to soul 1 (Reviewer).\n';
		const create = await invoke([
			'--db=x',
			'soul',
			'create',
			'Other',
			'--essence',
			'Other',
			'--description',
			'Other',
			'--external-id',
			'one',
		]);
		equal(create.code, 4);
		equal(create.err, expected);
		const other = createSoul(db, { name: 'Other', essence: 'Other', description: 'Other' });
		const update = await invoke([
			'--db=x',
			'soul',
			'update',
			String(other.id),
			'--external-id',
			'one',
		]);
		equal(update.code, 4);
		equal(update.err, expected);
	} finally {
		db.close();
	}
});

test('wording history is camelCase through library facade and CLI; records serialize cleanly; operator and review rows are ordered', async () => {
	const { db, soul, invoke } = await fixture();
	try {
		const trait = addTrait(db, soul.id, { principle: 'First', provenance: 'Observed', now: 10 });
		ok(trait.warnings?.length);
		ok(!Object.keys(trait).includes('warnings'));
		reviseTrait(db, trait.id, { principle: 'Second', reason: 'Clarity', now: 20 });
		const updated = updateSoul(db, soul.id, { essence: 'Revised', reason: 'Intent', now: 30 });
		ok(updated.warnings?.length);
		ok(!Object.keys(updated).includes('warnings'));
		const history = getRevisionHistory(db, { soulId: soul.id });
		equal(history[0]?.oldText, 'Read carefully');
		equal(history[0]?.newText, 'Revised');
		equal(history[0]?.entity, 'essence');
		equal(history[1]?.oldText, 'First');
		equal(history[1]?.newText, 'Second');
		deepEqual(Object.keys(history[0] ?? {}), [
			'id',
			'entity',
			'entityId',
			'soulId',
			'oldText',
			'newText',
			'reason',
			'operator',
			'createdAt',
		]);
		const facade = manageSoulToolHandler(db, {
			action: 'update',
			soulId: soul.id,
			essence: 'Facade',
		});
		ok(facade.ok);
		ok(!JSON.stringify(facade.data.soul).includes('warnings'));
		ok(facade.data.warnings?.length);
		const added = refineSoulToolHandler(db, {
			action: 'add_trait',
			soulId: soul.id,
			principle: 'Facade trait',
			provenance: 'Observed',
		});
		ok(added.ok);
		ok(!JSON.stringify(added.data.trait).includes('warnings'));
		ok(added.data.warnings?.length);
		const correction = await invoke([
			'--db=x',
			'soul',
			'update',
			'1',
			'--essence',
			'Corrected',
			'--strict',
			'--operator',
			'maintainer',
			'--reason',
			'Typo',
		]);
		equal(correction.code, 0);
		match(
			correction.err,
			/^warning: operator correction by maintainer bypassed: .*crystallization-ready.*cited shard.*\n$/,
		);
		equal(correction.err.trim().split('\n').length, 1);
		const corrected = JSON.parse(correction.out);
		equal(corrected.data.soul.warnings, undefined);
		equal(corrected.data.warnings.length, 1);
		const row = getRevisionHistory(db, { soulId: 1 })[0];
		equal(row?.operator, 'maintainer');
		match(row?.reason ?? '', /Typo/);
		const inspected = await invoke(['--db=x', 'soul', 'show', '1', '--history']);
		deepEqual(JSON.parse(inspected.out).data.history, getRevisionHistory(db, { soulId: 1 }));
		const review = await invoke([
			'--db=x',
			'review',
			'1',
			'--no-change',
			'--reason',
			'Still valid',
		]);
		equal(review.code, 0);
		const lines = review.out.trim().split('\n').slice(1);
		match(lines[0] ?? '', /^#\d+ review no change: Still valid$/);
		ok(lines.every((line) => /^#\d+ (review|trait|essence)( |$)/.test(line)));
	} finally {
		db.close();
	}
});

test('output env and default database notice apply to host generated and legacy commands only when opening', async () => {
	const { db, invoke } = await fixture();
	const keys = ['GHOSTPAW_OUTPUT', 'GHOSTPAW_SOULS_DB', 'GHOSTPAW_QUIET'] as const;
	const previous = keys.map((k) => process.env[k]);
	try {
		for (const key of keys) delete process.env[key];
		const notice = `using default db ${resolveSoulsDbPath()}\n`;
		for (const args of [
			['config', 'get', 'strict'],
			['search', 'evidence'],
			['call', 'search_souls', '{}'],
			['mcp'],
		]) {
			const normal = await invoke(args);
			equal(normal.code, 0);
			equal(normal.err, notice);
			equal(normal.opens, 1);
			ok(!normal.out.includes('using default db'));
			equal((await invoke([...args, '--quiet'])).err, '');
			equal((await invoke([...args, '--quiet'])).out, '');
			process.env.GHOSTPAW_QUIET = '1';
			equal((await invoke(args)).err, '');
			delete process.env.GHOSTPAW_QUIET;
			equal((await invoke([...args, '--db', 'x'])).err, '');
			process.env.GHOSTPAW_SOULS_DB = 'x';
			equal((await invoke(args)).err, '');
			delete process.env.GHOSTPAW_SOULS_DB;
		}
		for (const args of [
			['help'],
			['version'],
			['tools'],
			['describe', 'search_souls'],
			['skill'],
			['completions', 'bash'],
			['review', '--help'],
			['render', '--help'],
		]) {
			const result = await invoke(args);
			equal(result.code, 0);
			equal(result.err, '');
			equal(result.opens, 0);
		}
		process.env.GHOSTPAW_OUTPUT = 'json';
		for (const args of [
			['--db=x', 'config', 'get', 'strict'],
			['--db=x', 'search', 'evidence'],
			['--db=x', 'render', '1'],
		]) {
			const env = await invoke(args, '', true);
			delete process.env.GHOSTPAW_OUTPUT;
			const flag = await invoke([...args, '--json'], '', true);
			equal(env.out, flag.out);
			process.env.GHOSTPAW_OUTPUT = 'json';
		}
		process.env.GHOSTPAW_OUTPUT = 'other';
		equal((await invoke(['--db=x', 'render', '1'])).out.startsWith('# Reviewer'), true);
	} finally {
		keys.forEach((key, i) => {
			if (previous[i] === undefined) delete process.env[key];
			else process.env[key] = previous[i];
		});
		db.close();
	}
});

test('strict flag environment and config each require readiness and citations for add and essence updates', async () => {
	const previous = process.env.GHOSTPAW_SOULS_STRICT;
	try {
		delete process.env.GHOSTPAW_SOULS_STRICT;
		for (const mode of ['flag', 'environment', 'config']) {
			const { db, invoke } = await fixture();
			try {
				const extra = mode === 'flag' ? ['--strict'] : [];
				if (mode === 'environment') process.env.GHOSTPAW_SOULS_STRICT = '1';
				if (mode === 'config')
					equal((await invoke(['--db=x', 'config', 'set', 'strict', 'true'])).code, 0);
				const commands = [
					['refinement', 'add', '1', '--principle', 'Check evidence', '--provenance', 'Observed'],
					['soul', 'update', '1', '--essence', 'New essence'],
				];
				const now = Date.now(),
					day = 86400000;
				// A valid citation alone does not satisfy readiness.
				const first = await invoke([
					'--db=x',
					'shard',
					'add',
					'Read user intent',
					'--source',
					'chat',
					'--soul-ids',
					'1',
					'--occurred-at',
					String(now - 3 * day),
				]);
				equal(first.code, 0);
				const id = String(JSON.parse(first.out).data.shardId);
				for (const command of commands) {
					const result = await invoke(['--db=x', ...command, ...extra, '--shard-ids', id]);
					equal(result.code, 1);
					match(result.err, /crystallization-ready/);
				}
				equal(
					(
						await invoke([
							'--db=x',
							'shard',
							'add',
							'Verify rollback',
							'--source',
							'email',
							'--soul-ids',
							'1',
							'--occurred-at',
							String(now - day),
						])
					).code,
					0,
				);
				equal(
					(
						await invoke([
							'--db=x',
							'shard',
							'add',
							'Document contracts',
							'--source',
							'review',
							'--soul-ids',
							'1',
							'--occurred-at',
							String(now),
						])
					).code,
					0,
				);
				for (const command of commands) {
					const missing = await invoke(['--db=x', ...command, ...extra]);
					equal(missing.code, 1);
					match(missing.err, /cited shard/);
					const ready = await invoke(['--db=x', ...command, ...extra, '--shard-ids', id]);
					equal(ready.code, 0, ready.err);
				}
			} finally {
				db.close();
				delete process.env.GHOSTPAW_SOULS_STRICT;
			}
		}
	} finally {
		if (previous === undefined) delete process.env.GHOSTPAW_SOULS_STRICT;
		else process.env.GHOSTPAW_SOULS_STRICT = previous;
	}
});

test('config reads report effective booleans and their source', async () => {
	const { db, invoke } = await fixture();
	const previous = process.env.GHOSTPAW_SOULS_STRICT;
	try {
		delete process.env.GHOSTPAW_SOULS_STRICT;
		for (const [value, source] of [
			[false, 'default'],
			[true, 'db'],
			[false, 'env'],
		] as const) {
			if (source === 'db') await invoke(['config', 'set', 'strict', 'true']);
			if (source === 'env') process.env.GHOSTPAW_SOULS_STRICT = 'no';
			for (const args of [
				['config', 'get', 'strict'],
				['config', 'get'],
				['config', 'list'],
			]) {
				const result = await invoke([...args, '--json']);
				equal(result.code, 0);
				deepEqual(JSON.parse(result.out), { strict: value, source });
				equal((await invoke(args)).out, `strict: ${value} (${source})\n`);
			}
		}
		process.env.GHOSTPAW_SOULS_STRICT = 'invalid';
		deepEqual(JSON.parse((await invoke(['config', 'list', '--json'])).out), {
			strict: true,
			source: 'db',
		});
	} finally {
		if (previous === undefined) delete process.env.GHOSTPAW_SOULS_STRICT;
		else process.env.GHOSTPAW_SOULS_STRICT = previous;
		db.close();
	}
});

test('marker-free diffs compare whole files and stdin, trimming only one trailing newline', async () => {
	const { db, invoke } = await fixture();
	const dir = mkdtempSync(join(tmpdir(), 'souls-plain-diff-'));
	const file = join(dir, 'prompt');
	try {
		const rendered = (await invoke(['render', '1'])).out;
		for (const [text, same] of [
			[rendered, true],
			[`${rendered}\n`, true],
			[`${rendered}\n\n`, false],
			['Different', false],
			['', false],
		] as const) {
			writeFileSync(file, text);
			for (const against of [file, '-']) {
				const result = await invoke(
					['diff', '1', '--against', against, '--marker', 'custom', '--json'],
					text,
				);
				equal(result.code, same ? 0 : 1);
				const data = JSON.parse(result.out);
				equal(data.same, same);
				equal(data.markerFound, false);
				if (text === 'Different') deepEqual(data.removed, ['Different']);
			}
		}
		const marked = `outside\n<!-- custom:begin -->\n${rendered}\n<!-- custom:end -->\n`;
		const result = await invoke(
			['diff', '1', '--against', '-', '--marker', 'custom', '--json'],
			marked,
		);
		equal(result.code, 0);
		equal(JSON.parse(result.out).markerFound, true);
		match((await invoke(['diff', '--help'])).out, /whole input minus one trailing newline/);
	} finally {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	}
});
