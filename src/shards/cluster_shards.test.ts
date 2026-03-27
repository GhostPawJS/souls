import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clusterShards } from './cluster_shards.ts';
import type { ShardRecord } from './types.ts';

function makeShard(id: number, content: string, source = 'test'): ShardRecord {
	return {
		id,
		content,
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

describe('clusterShards', () => {
	it('returns empty for empty input', () => {
		strictEqual(clusterShards([]).length, 0);
	});

	it('groups similar shards together', () => {
		const shards = [
			makeShard(1, 'careful planning and deliberation'),
			makeShard(2, 'careful planning and consideration'),
			makeShard(3, 'completely different topic about weather'),
		];
		const clusters = clusterShards(shards, { threshold: 0.2 });
		ok(clusters.length >= 2);
	});
});
