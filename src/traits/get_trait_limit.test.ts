import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_TRAIT_LIMIT, getTraitLimit } from './get_trait_limit.ts';

describe('getTraitLimit', () => {
	it('returns default limit when no option provided', () => {
		strictEqual(getTraitLimit(), DEFAULT_TRAIT_LIMIT);
		strictEqual(getTraitLimit(), 10);
	});

	it('returns configured limit when provided', () => {
		strictEqual(getTraitLimit({ traitLimit: 5 }), 5);
	});
});
