import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { test } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { runToolCli } from '../surfaces/cli.ts';
import { createMcpServer } from '../surfaces/mcp_server.ts';
import type { JsonSchema } from '../surfaces/surface_types.ts';
import { getSoulsToolByName, listSoulsToolDefinitions } from '../tools/tool_registry.ts';
import type { ToolResult } from '../tools/tool_types.ts';
import { soulsCliOptions } from './souls_cli_options.ts';
import { soulsMcpOptions } from './souls_mcp_options.ts';
import { soulsMcpSurfaceTools, soulsSurfaceTools } from './souls_surface_tools.ts';

function check(result: ToolResult, label: string) {
	if (result.outcome !== 'error') return;
	assert.notEqual(result.error.code, 'system_error', label);
	assert.notEqual(result.error.kind, 'system', label);
	assert.doesNotMatch(result.error.message, /Cannot read properties|internal error/i, label);
	if (result.error.code === 'invalid_input') assert.ok(result.error.recovery, label);
}

test('partial input never produces system errors through surface or facade handlers', async () => {
	const db = await createInitializedSoulsDb();
	const server = createMcpServer(soulsMcpOptions(() => db));
	await server.handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
	let output = '';
	const stream = new Writable({
		write(chunk, _encoding, done) {
			output += chunk;
			done();
		},
	});
	try {
		for (const tool of listSoulsToolDefinitions()) {
			const cases: Record<string, unknown>[] = [{}];
			for (const action of tool.inputSchema.properties?.action?.enum ?? []) {
				cases.push({ action });
				for (const [name, schema] of Object.entries(tool.inputSchema.properties ?? {})) {
					const object = (schema: JsonSchema) =>
						schema.type === 'object' || schema.oneOf?.some((branch) => branch.type === 'object');
					if (object(schema)) cases.push({ action, [name]: {} });
					if (schema.type === 'array' && schema.items && object(schema.items))
						cases.push({ action, [name]: [{}] });
				}
			}
			for (const input of cases) {
				const label = `${tool.name}: ${JSON.stringify(input)}`;
				output = '';
				await runToolCli(['call', tool.name, JSON.stringify(input)], {
					...soulsCliOptions,
					stdout: stream,
					stderr: stream,
					openContext: () => db,
					closeContext: () => {},
				});
				assert.doesNotMatch(output, /system_error|internal error|Cannot read properties/i, label);
				if (/required|expected/.test(output))
					assert.match(output, /pass |recovery|clarification/, label);
				const response = await server.handleMessage({
					jsonrpc: '2.0',
					id: 2,
					method: 'tools/call',
					params: { name: tool.name, arguments: input },
				});
				const text = JSON.stringify(response);
				assert.doesNotMatch(text, /system_error|internal error|Cannot read properties/i, label);
				if (/required|expected/.test(text))
					assert.match(text, /pass |recovery|clarification/, label);
				const facade = getSoulsToolByName(tool.name);
				assert.ok(facade);
				check(facade.handler(db, input), label);
				for (const tools of [soulsSurfaceTools, soulsMcpSurfaceTools]) {
					const surface = tools.find((item) => item.name === tool.name);
					assert.ok(surface);
					check((await surface.handler(db, input)) as ToolResult, label);
				}
			}
		}
	} finally {
		db.close();
	}
});

test('partial plans name the missing nested paths and include a complete recovery shape', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const tool = getSoulsToolByName('level_up_soul');
		assert.ok(tool);
		const result = tool.handler(db, { action: 'execute', soulId: 1, plan: {} });
		assert.equal(result.outcome, 'error');
		if (result.outcome !== 'error') return;
		assert.equal(result.error.code, 'invalid_input');
		assert.match(result.error.recovery ?? '', /plan.newEssence/);
		assert.match(result.error.recovery ?? '', /"action":"execute"/);
		assert.match(result.error.recovery ?? '', /"consolidations":\[\]/);
	} finally {
		db.close();
	}
});
