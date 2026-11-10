import { match, ok, strictEqual } from 'node:assert';
import { Readable, Writable } from 'node:stream';
import { it } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { soulsCliOptions } from '../surface/souls_cli_options.ts';
import { runToolCli } from '../surfaces/cli.ts';
import { observeSoulToolHandler } from '../tools/observe_soul_tool.ts';
import { reviewTracesToolHandler } from '../tools/review_traces_tool.ts';
import { traceSoulToolHandler } from '../tools/trace_soul_tool.ts';

it('trace tools give nested examples, resolve names, and guard secrets without rejecting shards', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const s = createSoul(db, { name: 'Mentor', slug: 'mentor', essence: 'e', description: 'd' });
		const missing = traceSoulToolHandler(db, { action: 'record' });
		strictEqual(missing.outcome, 'needs_clarification');
		match(JSON.stringify(missing), /souls/);
		match(JSON.stringify(missing), /owner/);
		const recorded = traceSoulToolHandler(db, {
			action: 'record',
			text: 'Review draft',
			souls: [{ soul: 'mentor', role: 'owner' }],
			dueAt: 'tomorrow',
		});
		ok(recorded.ok);
		strictEqual(recorded.data.souls[0]?.soulId, s.id);
		const shown = reviewTracesToolHandler(db, { view: 'show', id: recorded.data.id });
		ok(shown.ok);
		const secret = traceSoulToolHandler(db, {
			action: 'revise',
			id: recorded.data.id,
			text: 'token=abc',
			reason: 'edit',
		});
		strictEqual(secret.ok, false);
		const shard = observeSoulToolHandler(db, {
			action: 'drop',
			content: 'token=abc',
			source: 'test',
			soulIds: [s.id],
			traceIds: [recorded.data.id],
		});
		ok(shard.ok);
		ok(shard.warnings?.some((w) => w.message.includes('credential')));
	} finally {
		db.close();
	}
});
it('all trace CLI writes return a top-level id; close has one verb and invalid --as exits two', async () => {
	const db = await createInitializedSoulsDb();
	createSoul(db, { name: 'Mentor', slug: 'mentor', essence: 'e', description: 'd' });
	const invoke = async (args: string[]) => {
		let out = '';
		let err = '';
		const code = await runToolCli([...args, '--json'], {
			...soulsCliOptions,
			defaultDbPath: () => undefined,
			openContext: () => db,
			closeContext: () => {},
			stdin: Readable.from([]),
			stdout: new Writable({
				write(c, _e, cb) {
					out += String(c);
					cb();
				},
			}),
			stderr: new Writable({
				write(c, _e, cb) {
					err += String(c);
					cb();
				},
			}),
		});
		return { code, out, err, result: out.startsWith('{') ? JSON.parse(out) : null };
	};
	try {
		let r = await invoke([
			'trace',
			'record',
			'Review draft',
			'--soul',
			'mentor:owner',
			'--tag',
			'promise',
			'--weight',
			'0.8',
			'--due',
			'2026-11-12',
		]);
		strictEqual(r.code, 0, r.err);
		const id = String(r.result.id);
		strictEqual(r.result.data.weight, 0.8);
		const shard = await invoke([
			'shard',
			'observe',
			'Read the draft',
			'--source',
			'review',
			'--soul-ids',
			'mentor',
			'--trace-ids',
			id,
		]);
		strictEqual(shard.code, 0, shard.err);
		const shardId = String(shard.result.data.shardId);
		for (const args of [
			[
				'revise',
				id,
				'--text',
				'Review final draft',
				'--reason',
				'Clarify',
				'--due',
				'none',
				'--weight',
				'none',
			],
			['link', id, '--soul', 'mentor:subject'],
			['unlink', id, '--soul', 'mentor:subject', '--reason', 'Remove'],
			['tag', id, '--tag', 'approval'],
			['untag', id, '--tag', 'approval', '--reason', 'Remove'],
			['cite', shardId, id],
			['settle', id, '--as', 'done', '--reason', 'Delivered'],
		]) {
			r = await invoke(['trace', ...args]);
			strictEqual(r.code, 0, r.err);
			strictEqual(r.result.id, Number(id));
		}
		strictEqual(r.result.data.state, 'done');
		r = await invoke(['trace', 'settle', id, '--as', 'bad', '--reason', 'x']);
		strictEqual(r.code, 2);
		match(r.err, /done, dropped/);
		r = await invoke(['trace', 'settle', id, '--as', 'dropped', '--reason', 'Again']);
		strictEqual(r.code, 4);
		for (const view of [
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
			r = await invoke(['trace', view, '--help']);
			match(r.out, /Example:/);
		}
	} finally {
		db.close();
	}
});
