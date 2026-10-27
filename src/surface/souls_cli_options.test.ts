import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
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
