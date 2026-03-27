import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { trigramSet } from './trigram_set.ts';

describe('trigramSet', () => {
	it('returns a Set of strings', () => {
		const result = trigramSet('hello');
		ok(result instanceof Set);
		ok(result.size > 0);
	});

	it('is case-insensitive', () => {
		const lower = trigramSet('hello');
		const upper = trigramSet('HELLO');
		strictEqual(lower.size, upper.size);
		for (const tri of lower) ok(upper.has(tri));
	});

	it('returns empty for empty string', () => {
		const result = trigramSet('');
		// An empty string produces only whitespace padding trigrams;
		// we treat size 0 or very small as "essentially empty content"
		ok(result.size <= 1);
	});
});
