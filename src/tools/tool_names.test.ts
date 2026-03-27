import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	inspectSoulsItemToolName,
	levelUpSoulToolName,
	manageSoulToolName,
	observeSoulToolName,
	refineSoulToolName,
	reviewSoulsToolName,
	searchSoulsToolName,
} from './tool_names.ts';

const allNames = [
	searchSoulsToolName,
	reviewSoulsToolName,
	inspectSoulsItemToolName,
	observeSoulToolName,
	refineSoulToolName,
	levelUpSoulToolName,
	manageSoulToolName,
];

describe('tool names', () => {
	it('exports exactly 7 tool names', () => {
		strictEqual(allNames.length, 7);
	});

	it('every name is a non-empty string', () => {
		for (const name of allNames) {
			ok(typeof name === 'string' && name.length > 0, `bad name: ${name}`);
		}
	});

	it('all names are unique', () => {
		strictEqual(new Set(allNames).size, allNames.length);
	});

	it('names follow snake_case convention', () => {
		for (const name of allNames) {
			ok(/^[a-z][a-z0-9_]*$/.test(name), `"${name}" is not snake_case`);
		}
	});

	it('has expected values', () => {
		strictEqual(searchSoulsToolName, 'search_souls');
		strictEqual(reviewSoulsToolName, 'review_souls');
		strictEqual(inspectSoulsItemToolName, 'inspect_souls_item');
		strictEqual(observeSoulToolName, 'observe_soul');
		strictEqual(refineSoulToolName, 'refine_soul');
		strictEqual(levelUpSoulToolName, 'level_up_soul');
		strictEqual(manageSoulToolName, 'manage_soul');
	});
});
