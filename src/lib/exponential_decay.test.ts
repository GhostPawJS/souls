import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { exponentialDecay } from './exponential_decay.ts';

describe('exponentialDecay', () => {
	it('returns 1 at age 0', () => {
		strictEqual(exponentialDecay(0), 1);
	});

	it('returns a value between 0 and 1 for positive ages', () => {
		const val = exponentialDecay(30);
		ok(val > 0 && val < 1);
	});

	it('decreases as age increases', () => {
		ok(exponentialDecay(10) > exponentialDecay(60));
	});

	it('respects custom halfLife', () => {
		const fast = exponentialDecay(30, 15);
		const slow = exponentialDecay(30, 120);
		ok(fast < slow);
	});
});
