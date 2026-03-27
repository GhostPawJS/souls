import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { trigramJaccard } from './trigram_jaccard.ts';

describe('trigramJaccard', () => {
	it('returns 1 for identical strings', () => {
		strictEqual(trigramJaccard('hello world', 'hello world'), 1);
	});

	it('returns 0 for completely different strings', () => {
		const score = trigramJaccard('aaa', 'zzz');
		strictEqual(score, 0);
	});

	it('returns a value between 0 and 1 for similar strings', () => {
		const score = trigramJaccard('hello world', 'hello earth');
		ok(score > 0 && score < 1);
	});

	it('is case-insensitive', () => {
		const score = trigramJaccard('Hello', 'hello');
		strictEqual(score, 1);
	});
});
