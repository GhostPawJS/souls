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
import { getSoulsToolByName, listSoulsToolDefinitions, soulsTools } from './tool_registry.ts';

describe('tool_registry', () => {
	it('soulsTools contains all 7 tools', () => {
		strictEqual(soulsTools.length, 7);
	});

	it('each tool has a unique name', () => {
		const names = new Set(soulsTools.map((t) => t.name));
		strictEqual(names.size, 7);
	});

	it('all expected tool names are present', () => {
		const names = new Set(soulsTools.map((t) => t.name));
		ok(names.has(searchSoulsToolName));
		ok(names.has(reviewSoulsToolName));
		ok(names.has(inspectSoulsItemToolName));
		ok(names.has(observeSoulToolName));
		ok(names.has(refineSoulToolName));
		ok(names.has(levelUpSoulToolName));
		ok(names.has(manageSoulToolName));
	});

	it('getSoulsToolByName returns tool for known name', () => {
		const tool = getSoulsToolByName(observeSoulToolName);
		ok(tool !== null);
		strictEqual(tool?.name, observeSoulToolName);
	});

	it('getSoulsToolByName returns null for unknown name', () => {
		strictEqual(getSoulsToolByName('no_such_tool'), null);
	});

	it('listSoulsToolDefinitions returns all tools with handlers', () => {
		const defs = listSoulsToolDefinitions();
		strictEqual(defs.length, 7);
		for (const def of defs) {
			ok('handler' in def);
		}
	});
});
