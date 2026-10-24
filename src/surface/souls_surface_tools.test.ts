import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateInput } from '../surfaces/validate_input.ts';
import { soulsSurfaceTools } from './souls_surface_tools.ts';

const inputs: Record<string, Record<string, unknown>> = {
	search_souls: { query: 'review' },
	review_souls: { view: 'list' },
	inspect_souls_item: { soulId: 1 },
	observe_soul: {
		action: 'drop',
		content: 'Observed careful review',
		source: 'manual_review',
		soulIds: [1],
	},
	refine_soul: {
		action: 'add_trait',
		soulId: 1,
		principle: 'Check intent',
		provenance: 'Review evidence',
	},
	level_up_soul: { action: 'revert', soulId: 1 },
	manage_soul: {
		action: 'create',
		name: 'Reviewer',
		essence: 'Read intent',
		description: 'Code review identity',
	},
};
test('every Souls schema accepts representative handler inputs and rejects invalid shapes', () => {
	for (const tool of soulsSurfaceTools) {
		assert.ok(inputs[tool.name], tool.name);
		assert.deepEqual(validateInput(tool.inputSchema, inputs[tool.name]), [], tool.name);
		assert.ok(validateInput(tool.inputSchema, []).length, tool.name);
		for (const required of tool.inputSchema.required ?? []) {
			const input = { ...inputs[tool.name] };
			delete input[required];
			assert.ok(validateInput(tool.inputSchema, input).length, `${tool.name}.${required}`);
		}
	}
});
