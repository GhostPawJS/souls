import { ok } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeClusterWeight } from './compute_cluster_weight.ts';
import type { ShardRecord } from './types.ts';

function makeShard(source: string): ShardRecord {
	return {
		id: 1,
		content: 'Test',
		source,
		status: 'pending',
		sealed: false,
		soulIds: [1],
		traitIds: [],
		tags: [],
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
}

describe('computeClusterWeight', () => {
	it('returns a positive weight for non-empty input', () => {
		const weight = computeClusterWeight([makeShard('a'), makeShard('b')]);
		ok(weight > 0);
	});

	it('is higher with more source diversity', () => {
		const sameSource = computeClusterWeight([makeShard('a'), makeShard('a')]);
		const diffSource = computeClusterWeight([makeShard('a'), makeShard('b')]);
		ok(diffSource > sameSource);
	});
});
