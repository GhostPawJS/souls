import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { runToolCli } from '../surfaces/cli.ts';
import { soulsCliOptions } from './souls_cli_options.ts';

test('only soul --essence reads @file; shard content, names and provenance stay literal', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'souls-file-values-'));
	const run = async (args: string[]) => {
		let out = '';
		let err = '';
		const sink = (write: (text: string) => void) =>
			new Writable({
				write(chunk, _encoding, done) {
					write(String(chunk));
					done();
				},
			});
		const code = await runToolCli([...args, '--db', join(dir, 'souls.db')], {
			...soulsCliOptions,
			stdin: Readable.from([]),
			stdout: sink((text) => {
				out += text;
			}),
			stderr: sink((text) => {
				err += text;
			}),
		});
		return { code, out, err };
	};
	try {
		const essence = join(dir, 'essence.md');
		writeFileSync(essence, 'Reads the diff twice.\n');
		const created = await run([
			'soul',
			'create',
			'@reviewer',
			'--essence',
			`@${essence}`,
			'--description',
			'@/etc/passwd',
			'--json',
		]);
		assert.equal(created.code, 0, created.err);
		const soul = JSON.parse(created.out).data.soul;
		assert.equal(soul.name, '@reviewer');
		assert.equal(soul.essence, 'Reads the diff twice.\n');
		assert.equal(soul.description, '@/etc/passwd');
		const dropped = await run([
			'shard',
			'drop',
			'@/etc/passwd',
			'--source',
			'@@observed',
			'--soul-ids',
			String(soul.id),
			'--json',
		]);
		assert.equal(dropped.code, 0, dropped.err);
		const shard = JSON.stringify(JSON.parse(dropped.out));
		assert.ok(shard.includes('"@/etc/passwd"') && shard.includes('"@@observed"'), shard);
		assert.ok(!shard.includes('root:'));
		const trait = await run([
			'refinement',
			'add',
			String(soul.id),
			'--principle',
			'@/etc/passwd',
			'--provenance',
			'@@cited',
			'--json',
		]);
		assert.equal(trait.code, 0, trait.err);
		const traitText = JSON.stringify(JSON.parse(trait.out));
		assert.ok(traitText.includes('"@/etc/passwd"') && traitText.includes('"@@cited"'), traitText);
		const escaped = await run(['soul', 'update', String(soul.id), '--essence', '@@x', '--json']);
		assert.equal(escaped.code, 0, escaped.err);
		assert.equal(JSON.parse(escaped.out).data.soul.essence, '@x');
		const empty = await run(['soul', 'update', String(soul.id), '--essence', '@']);
		assert.equal(empty.code, 2);
		assert.match(empty.err, /Empty file path for essence; use @@ for a literal leading @/);
		const missing = await run(['soul', 'update', String(soul.id), '--essence', `@${dir}/none`]);
		assert.equal(missing.code, 2);
		assert.match(missing.err, /Cannot read value file for essence: .*none \(use @@/);
		assert.doesNotMatch(missing.err, /ENOENT/);
		const help = await run(['soul', 'create', '--help']);
		assert.match(help.out, /--essence {2}string \(@file, @- stdin, @@ literal @\)/);
		assert.doesNotMatch(help.out, /--description {2}string \(@file/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
