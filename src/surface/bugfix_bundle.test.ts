import { equal, match, throws } from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { test } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { updateSoul } from '../souls/update_soul.ts';
import { runToolCli } from '../surfaces/cli.ts';
import { manageSoulToolHandler } from '../tools/manage_soul_tool.ts';
import { addTrait } from '../traits/add_trait.ts';
import { getTraitOrThrow } from '../traits/get_trait_or_throw.ts';
import { soulsCliOptions } from './souls_cli_options.ts';

test('invalid essence never writes through API, tool, or CLI; show JSON exposes full essence', async () => {
	const db = await createInitializedSoulsDb();
	const dir = mkdtempSync(join(process.cwd(), '.bundle-'));
	const soul = createSoul(db, {
		name: 'Reviewer',
		essence: 'Full\nessence\n',
		description: 'Review',
	});
	const invoke = async (args: string[]) => {
		let out = '',
			err = '';
		const sink = (add: (s: string) => void) =>
			new Writable({
				write(chunk, _encoding, done) {
					add(String(chunk));
					done();
				},
			});
		const code = await runToolCli(['--db=x', ...args], {
			...soulsCliOptions,
			openContext: () => db,
			closeContext: () => {},
			stdout: sink((s) => {
				out += s;
			}),
			stderr: sink((s) => {
				err += s;
			}),
		});
		return { code, out, err };
	};
	try {
		for (const essence of ['', ' \n ', 'null', ' null\n', 'undefined', ' undefined ']) {
			throws(() => updateSoul(db, soul.id, { essence, name: 'Wrong' }), /Soul essence/);
			equal(manageSoulToolHandler(db, { action: 'update', soulId: soul.id, essence }).ok, false);
			const file = join(dir, 'essence');
			writeFileSync(file, essence);
			equal((await invoke(['soul', 'update', String(soul.id), '--essence', `@${file}`])).code, 2);
			equal(getSoulOrThrow(db, soul.id).essence, soul.essence);
			equal(getSoulOrThrow(db, soul.id).name, soul.name);
		}
		equal(
			JSON.parse((await invoke(['soul', 'show', '1', '--json'])).out).data.profile.soul.essence,
			soul.essence,
		);
		const note = await invoke([
			'soul',
			'update',
			'1',
			'--essence',
			'New wording',
			'--operator',
			'Maintainer',
		]);
		equal(note.code, 0);
		match(
			note.err,
			/^note: soul essence updated; no shards were linked \(.*cited shard id is required\.\)\n$/,
		);
		equal(getSoulOrThrow(db, soul.id).essence, 'New wording');
		const help = await invoke(['refinement', 'revise', '--help']);
		match(help.out, /<traitId>/);
		match(help.out, /does not restore previous wording/);
		const trait = addTrait(db, soul.id, { principle: 'Original', provenance: 'Observed' });
		const conflict = await invoke([
			'refinement',
			'revise',
			'1',
			'--trait-id',
			'2',
			'--principle',
			'Wrong',
		]);
		equal(conflict.code, 2);
		match(conflict.err, /disagrees/);
		equal(getTraitOrThrow(db, trait.id).principle, 'Original');
		equal(
			(
				await invoke([
					'refinement',
					'revise',
					String(trait.id),
					'--trait-id',
					String(trait.id),
					'--principle',
					'Revised',
				])
			).code,
			0,
		);
		equal((await invoke(['refinement', 'revert', String(trait.id)])).code, 0);
		equal(getTraitOrThrow(db, trait.id).principle, 'Revised');
		equal(getTraitOrThrow(db, trait.id).status, 'reverted');
	} finally {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	}
});

test('CLI exits quietly on EPIPE after a committed soul write', async () => {
	const dir = mkdtempSync(join(process.cwd(), '.epipe-'));
	try {
		const child = spawn(
			process.execPath,
			[
				'--disable-warning=ExperimentalWarning',
				'--experimental-strip-types',
				'src/cli.ts',
				'--db',
				join(dir, 'souls.db'),
				'soul',
				'create',
				'Committed',
				'--essence',
				'Saved',
				'--description',
				'Saved',
				'--json',
			],
			{ stdio: ['ignore', 'pipe', 'pipe'] },
		);
		child.stdout.destroy();
		let err = '';
		child.stderr.on('data', (chunk) => {
			err += chunk;
		});
		const code = await new Promise<number | null>((resolve, reject) => {
			child.on('error', reject);
			child.on('close', resolve);
		});
		equal(code, 0);
		equal(err, '');
		const { DatabaseSync } = await import('node:sqlite');
		const db = new DatabaseSync(join(dir, 'souls.db'));
		try {
			equal(db.prepare('SELECT COUNT(*) AS n FROM souls').get()?.n, 1);
		} finally {
			db.close();
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
