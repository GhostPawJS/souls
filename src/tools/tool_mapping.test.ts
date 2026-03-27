import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type SoulsToolMapping, soulsToolMappings } from './tool_mapping.ts';
import {
	inspectSoulsItemToolName,
	levelUpSoulToolName,
	manageSoulToolName,
	observeSoulToolName,
	refineSoulToolName,
	reviewSoulsToolName,
	searchSoulsToolName,
} from './tool_names.ts';

const validToolNames = new Set([
	searchSoulsToolName,
	reviewSoulsToolName,
	inspectSoulsItemToolName,
	observeSoulToolName,
	refineSoulToolName,
	levelUpSoulToolName,
	manageSoulToolName,
]);

describe('soulsToolMappings', () => {
	it('is a non-empty array', () => {
		ok(soulsToolMappings.length > 0);
	});

	it('every mapping has a valid tool name', () => {
		for (const m of soulsToolMappings) {
			ok(validToolNames.has(m.tool), `Unknown tool "${m.tool}" for source "${m.source}"`);
		}
	});

	it('every mapping has a non-empty source name', () => {
		for (const m of soulsToolMappings) {
			ok(m.source.length > 0, 'source must not be empty');
		}
	});

	it('source names are unique', () => {
		const sources = soulsToolMappings.map((m: SoulsToolMapping) => m.source);
		const unique = new Set(sources);
		strictEqual(unique.size, sources.length, 'duplicate source names found');
	});

	it('maps dropShard to observe_soul', () => {
		const m = soulsToolMappings.find((m: SoulsToolMapping) => m.source === 'dropShard');
		ok(m);
		strictEqual(m.tool, observeSoulToolName);
		strictEqual(m.action, 'drop');
	});

	it('maps createSoul to manage_soul', () => {
		const m = soulsToolMappings.find((m: SoulsToolMapping) => m.source === 'createSoul');
		ok(m);
		strictEqual(m.tool, manageSoulToolName);
		strictEqual(m.action, 'create');
	});

	it('maps levelUp to level_up_soul', () => {
		const m = soulsToolMappings.find((m: SoulsToolMapping) => m.source === 'levelUp');
		ok(m);
		strictEqual(m.tool, levelUpSoulToolName);
		strictEqual(m.action, 'execute');
	});

	it('maps searchShards to search_souls', () => {
		const m = soulsToolMappings.find((m: SoulsToolMapping) => m.source === 'searchShards');
		ok(m);
		strictEqual(m.tool, searchSoulsToolName);
	});

	it('maps getSoulProfile to inspect_souls_item', () => {
		const m = soulsToolMappings.find((m: SoulsToolMapping) => m.source === 'getSoulProfile');
		ok(m);
		strictEqual(m.tool, inspectSoulsItemToolName);
	});
});
