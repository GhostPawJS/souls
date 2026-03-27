import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHARD_STATUSES } from './types.ts';

describe('shard type constants', () => {
	it('SHARD_STATUSES includes pending and faded', () => {
		ok(SHARD_STATUSES.includes('pending'));
		ok(SHARD_STATUSES.includes('faded'));
		strictEqual(SHARD_STATUSES.length, 2);
	});
});
