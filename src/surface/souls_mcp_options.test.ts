import assert from 'node:assert/strict';
import { test } from 'node:test';
import { soulsTools } from '../tools/tool_registry.ts';
import { openSoulsDb } from './open_souls_db.ts';
import { soulsMcpOptions } from './souls_mcp_options.ts';

test('MCP bindings preserve the registry and describe local side effects', async () => {
	const db = await openSoulsDb(':memory:');
	try {
		const options = soulsMcpOptions(() => db);
		assert.equal(options.name, 'ghostpaw-souls');
		assert.deepEqual(
			options.tools.map((tool) => tool.name),
			soulsTools.map((tool) => tool.name),
		);
		for (const tool of options.tools) {
			const annotations = options.annotations?.(tool);
			assert.equal(annotations?.readOnlyHint, tool.readOnly);
			assert.equal(annotations?.idempotentHint, tool.readOnly);
			assert.equal(annotations?.openWorldHint, false);
			assert.equal(
				annotations?.destructiveHint,
				['manage_soul', 'refine_soul', 'level_up_soul'].includes(tool.name),
			);
		}
		const create = options.tools.find((tool) => tool.name === 'manage_soul');
		const result = await create?.handler(db, {
			action: 'create',
			name: 'Reviewer',
			essence: 'Read intent',
			description: 'Review identity',
		});
		assert.ok(result && typeof result === 'object' && 'ok' in result && result.ok);
	} finally {
		db.close();
	}
});
