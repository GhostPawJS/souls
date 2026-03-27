import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TRAIT_STATUSES } from './types.ts';

describe('trait type constants', () => {
	it('TRAIT_STATUSES includes active', () => {
		ok(TRAIT_STATUSES.includes('active'));
	});

	it('TRAIT_STATUSES has all four statuses', () => {
		strictEqual(TRAIT_STATUSES.length, 4);
	});
});
