import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { runToolCli } from '../surfaces/cli.ts';
import { cliCommands } from '../surfaces/cli_commands.ts';
import { soulsCliOptions } from './souls_cli_options.ts';
import { soulsMcpSurfaceTools, soulsSurfaceTools } from './souls_surface_tools.ts';

test('souls noun verb create, drop, search, show and not found use a file database', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'souls-cli-'));
	try {
		const invoke = async (args: string[]) => {
			let out = '';
			const code = await runToolCli([...args, '--db', join(dir, 'test.db'), '--json'], {
				...soulsCliOptions,
				stdin: Readable.from([]),
				stdout: new Writable({
					write(chunk, _encoding, cb) {
						out += String(chunk);
						cb();
					},
				}),
				stderr: new Writable({
					write(_chunk, _encoding, cb) {
						cb();
					},
				}),
			});
			return { code, result: JSON.parse(out) };
		};
		const added = await invoke([
			'soul',
			'create',
			'Reviewer',
			'--essence',
			'Read carefully.',
			'--description',
			'Review identity',
		]);
		assert.equal(added.code, 0);
		const id = added.result.data.soul.id;
		const shown = await invoke(['soul', 'show', String(id)]);
		assert.equal(shown.code, 0);
		assert.equal(shown.result.data.profile.soul.name, 'Reviewer');
		const dropped = await invoke([
			'shard',
			'drop',
			'Checked the evidence',
			'--source',
			'observed',
			'--soul-ids',
			String(id),
		]);
		assert.equal(dropped.code, 0);
		const found = await invoke(['search', 'evidence']);
		assert.equal(found.result.data.shards.length, 1);
		assert.equal((await invoke(['soul', 'show', '99999'])).code, 3);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('souls command paths cover every tool and action uniquely without changing MCP metadata', () => {
	const commands = cliCommands(soulsSurfaceTools);
	assert.equal(commands.length, 19);
	assert.equal(new Set(commands.map((c) => c.path)).size, commands.length);
	assert.equal(new Set(commands.map((c) => c.tool.name)).size, soulsMcpSurfaceTools.length);
	assert.ok(soulsMcpSurfaceTools.every((tool) => tool.cli === undefined));
	for (const tool of soulsSurfaceTools) {
		const actions = tool.inputSchema.properties?.action?.enum;
		if (actions)
			assert.deepEqual(
				commands.filter((c) => c.tool.name === tool.name).map((c) => c.fixed.action),
				actions,
			);
	}
});

test('CLI creates missing database parents and reports blocked parents as usage errors', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'souls-cli-db-'));
	try {
		const blocker = join(dir, 'file');
		writeFileSync(blocker, '');
		for (const command of [
			['search', 'Reviewer'],
			['call', 'search_souls', '{"query":"Reviewer"}'],
		]) {
			for (const blocked of [false, true]) {
				const parent = join(dir, blocked ? 'file' : (command[0] as string), 'nested');
				const path = join(parent, 'souls.db');
				let stderr = '';
				const code = await runToolCli([...command, '--db', path], {
					...soulsCliOptions,
					stdin: Readable.from([]),
					stdout: new Writable({
						write(_chunk, _encoding, cb) {
							cb();
						},
					}),
					stderr: new Writable({
						write(chunk, _encoding, cb) {
							stderr += String(chunk);
							cb();
						},
					}),
				});
				assert.equal(code, blocked ? 2 : 0);
				assert.equal(
					stderr,
					blocked
						? `Cannot create database directory ${parent}: a path component is not a directory\n`
						: '',
				);
				if (!blocked) {
					assert.ok(statSync(parent).isDirectory());
					assert.ok(statSync(path).isFile());
				}
			}
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
