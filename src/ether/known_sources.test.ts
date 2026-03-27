import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALL_KNOWN_SOURCES, AWESOME_PROMPTS, ROSEHILL_LIBRARY } from './known_sources.ts';

describe('known_sources', () => {
	it('AWESOME_PROMPTS has correct id and kind', () => {
		strictEqual(AWESOME_PROMPTS.id, 'awesome-chatgpt-prompts');
		strictEqual(AWESOME_PROMPTS.kind, 'github-csv');
		ok(AWESOME_PROMPTS.url.includes('prompts.csv'));
	});

	it('ROSEHILL_LIBRARY has correct id and kind', () => {
		strictEqual(ROSEHILL_LIBRARY.id, 'rosehill-system-prompts');
		strictEqual(ROSEHILL_LIBRARY.kind, 'github-json');
		ok(ROSEHILL_LIBRARY.url.includes('index.json'));
	});

	it('ALL_KNOWN_SOURCES contains both', () => {
		strictEqual(ALL_KNOWN_SOURCES.length, 2);
		strictEqual(ALL_KNOWN_SOURCES[0], AWESOME_PROMPTS);
		strictEqual(ALL_KNOWN_SOURCES[1], ROSEHILL_LIBRARY);
	});
});
