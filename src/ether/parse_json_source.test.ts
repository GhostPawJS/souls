import { strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EtherParseError } from './errors.ts';
import { parseJsonSource } from './parse_json_source.ts';

const makeJson = (prompts: unknown[]) =>
	JSON.stringify({ metadata: { total_prompts: prompts.length }, prompts });

describe('parseJsonSource', () => {
	it('parses a valid Rosehill entry', () => {
		const json = makeJson([
			{
				agent_name: 'Task Manager',
				description: 'Helps manage tasks',
				features: { is_agent: true },
				metadata: { original_filename: 'TaskManager.json' },
				full_data: {
					'System Prompt': 'You are a task management assistant.',
					'Creation Date': '2025-01-01',
				},
			},
		]);
		const entries = parseJsonSource(json);
		strictEqual(entries.length, 1);
		strictEqual(entries[0]!.name, 'Task Manager');
		strictEqual(entries[0]!.description, 'Helps manage tasks');
		strictEqual(entries[0]!.content, 'You are a task management assistant.');
		strictEqual(entries[0]!.externalId, 'TaskManager.json');
		strictEqual(entries[0]!.category, 'agent');
	});

	it('skips entries with null System Prompt', () => {
		const json = makeJson([
			{ agent_name: 'Empty', full_data: { 'System Prompt': null } },
			{ agent_name: 'Valid', full_data: { 'System Prompt': 'Real content.' } },
		]);
		const entries = parseJsonSource(json);
		strictEqual(entries.length, 1);
		strictEqual(entries[0]!.name, 'Valid');
	});

	it('skips entries with empty agent_name', () => {
		const json = makeJson([{ agent_name: '', full_data: { 'System Prompt': 'Content.' } }]);
		const entries = parseJsonSource(json);
		strictEqual(entries.length, 0);
	});

	it('skips entries with empty System Prompt string', () => {
		const json = makeJson([{ agent_name: 'X', full_data: { 'System Prompt': '   ' } }]);
		const entries = parseJsonSource(json);
		strictEqual(entries.length, 0);
	});

	it('generates externalId from name when filename missing', () => {
		const json = makeJson([
			{ agent_name: 'My Cool Bot', full_data: { 'System Prompt': 'Hello.' } },
		]);
		const entries = parseJsonSource(json);
		strictEqual(entries[0]!.externalId, 'my-cool-bot');
	});

	it('stores feature flags in metadata', () => {
		const json = makeJson([
			{
				agent_name: 'Bot',
				features: { is_agent: true, structured_output: true, image_generation: false },
				full_data: { 'System Prompt': 'Hello.', 'Creation Date': '2025-06-01' },
			},
		]);
		const entries = parseJsonSource(json);
		const meta = JSON.parse(entries[0]!.metadata!);
		strictEqual(meta.is_agent, true);
		strictEqual(meta.structured_output, true);
		strictEqual(meta.creationDate, '2025-06-01');
		strictEqual(meta.image_generation, undefined);
	});

	it('throws on invalid JSON', () => {
		throws(() => parseJsonSource('not json'), EtherParseError);
	});

	it('throws when prompts array is missing', () => {
		throws(() => parseJsonSource('{"metadata":{}}'), EtherParseError);
	});

	it('handles multiple entries', () => {
		const json = makeJson([
			{ agent_name: 'A', full_data: { 'System Prompt': 'Prompt A.' } },
			{ agent_name: 'B', full_data: { 'System Prompt': 'Prompt B.' } },
			{ agent_name: 'C', full_data: { 'System Prompt': 'Prompt C.' } },
		]);
		const entries = parseJsonSource(json);
		strictEqual(entries.length, 3);
	});
});
