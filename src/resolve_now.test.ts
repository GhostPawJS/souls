import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveNow } from './resolve_now.ts';

describe('resolveNow', () => {
	it('returns the given timestamp when provided', () => {
		strictEqual(resolveNow(42), 42);
	});

	it('returns Date.now() when no timestamp is given', () => {
		const before = Date.now();
		const result = resolveNow();
		const after = Date.now();
		strictEqual(result >= before, true);
		strictEqual(result <= after, true);
	});
});
