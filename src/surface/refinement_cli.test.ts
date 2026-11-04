import { equal, match, ok } from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { runToolCli } from '../surfaces/cli.ts';
import { soulsCliOptions } from './souls_cli_options.ts';

test('CLI strict gates, warnings, operator reasons, paging, atomic apply, and conflicts', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'souls-refine-cli-'));
	const invoke = async (args: string[]) => {
		let out = '',
			err = '';
		const sink = (write: (s: string) => void) =>
			new Writable({
				write(chunk, _enc, cb) {
					write(String(chunk));
					cb();
				},
			});
		const code = await runToolCli([...args, '--db', join(dir, 'test.db'), '--json'], {
			...soulsCliOptions,
			stdin: Readable.from([]),
			stdout: sink((s) => {
				out += s;
			}),
			stderr: sink((s) => {
				err += s;
			}),
		});
		return { code, err, result: out ? JSON.parse(out) : undefined };
	};
	try {
		const created = await invoke([
			'soul',
			'create',
			'Reviewer',
			'--essence',
			'Read carefully',
			'--description',
			'Review',
		]);
		equal(created.code, 0);
		const id = String(created.result.data.soul.id);
		const strict = await invoke([
			'refinement',
			'add',
			id,
			'--principle',
			'Check evidence',
			'--provenance',
			'Observed',
			'--strict',
		]);
		equal(strict.code, 1);
		match(strict.err, /crystallization-ready/);
		const added = await invoke([
			'refinement',
			'add',
			id,
			'--principle',
			'Check evidence',
			'--provenance',
			'Observed',
		]);
		equal(added.code, 0);
		match(added.err, /^warning: /);
		ok(added.result.data.warnings.length);
		const t = String(added.result.data.trait.id);
		equal(
			(
				await invoke([
					'refinement',
					'revise',
					t,
					'--principle',
					'Check evidence first',
					'--reason',
					'Clarify',
				])
			).code,
			0,
		);
		const correction = await invoke([
			'soul',
			'update',
			id,
			'--essence',
			'Corrected',
			'--strict',
			'--operator',
			'maintainer',
			'--reason',
			'Correction',
		]);
		equal(correction.code, 0);
		const observed = await invoke([
			'shard',
			'drop',
			'Observed review',
			'--source',
			'test',
			'--soul-ids',
			id,
			'--occurred-at',
			'1234',
		]);
		equal(observed.code, 0);
		equal(observed.result.data.shard.createdAt, 1234);
		const shardId = String(observed.result.data.shard.id);
		const page = await invoke(['search', '--status', 'all', '--limit', '1']);
		equal(page.code, 0);
		equal(page.result.data.total, 1);
		equal(page.result.data.hasMore, false);
		const history = await invoke(['soul', 'show', id, '--history']);
		equal(history.code, 0);
		ok(history.result.data.history.some((r: { operator: string }) => r.operator === 'maintainer'));
		const revision = String(history.result.data.history[0].id);
		const applied = await invoke([
			'refinement',
			'apply',
			id,
			'--trait-id',
			t,
			'--principle',
			'Applied atomically',
			'--provenance',
			'Observed',
			'--shard-ids',
			shardId,
			'--expected-revision',
			revision,
		]);
		equal(applied.code, 0);
		equal(applied.result.data.trait.principle, 'Applied atomically');
		const conflict = await invoke([
			'refinement',
			'apply',
			id,
			'--trait-id',
			t,
			'--principle',
			'Stale writer',
			'--provenance',
			'Observed',
			'--shard-ids',
			shardId,
			'--expected-revision',
			'0',
		]);
		equal(conflict.code, 4);
		match(conflict.err, /conflict/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
