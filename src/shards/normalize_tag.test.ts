import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeTag, normalizeTags } from './normalize_tag.ts';

describe('normalizeTag', () => {
	it('lowercases and trims', () => {
		strictEqual(normalizeTag('  HELLO  '), 'hello');
	});
});

describe('normalizeTags', () => {
	it('deduplicates and filters empty', () => {
		const result = normalizeTags(['A', 'a', '', ' b ']);
		deepStrictEqual(result.sort(), ['a', 'b']);
	});
});
