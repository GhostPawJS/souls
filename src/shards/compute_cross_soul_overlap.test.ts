import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { clusterShards } from './cluster_shards.ts';
import { computeCrossSoulOverlap } from './compute_cross_soul_overlap.ts';
import { dropShard } from './drop_shard.ts';
import { listShards } from './list_shards.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('computeCrossSoulOverlap', () => {
	it('returns empty overlaps when no shards are shared', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		dropShard(db, { content: 'Private observation.', source: 'test', soulIds: [soul.id] });
		const shards = listShards(db, { soulId: soul.id });
		const clusters = clusterShards(shards);
		const overlaps = computeCrossSoulOverlap(db, soul.id, clusters);
		strictEqual(overlaps.length, clusters.length);
		for (const ov of overlaps) {
			strictEqual(ov.length, 0);
		}
	});

	it('detects overlap when a shard is attributed to multiple souls', () => {
		const soul1 = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const soul2 = createSoul(db, { name: 'B', essence: 'E', description: 'D' });
		dropShard(db, {
			content: 'Shared observation between both souls.',
			source: 'test',
			soulIds: [soul1.id, soul2.id],
		});
		const shards = listShards(db, { soulId: soul1.id });
		const clusters = clusterShards(shards);
		const overlaps = computeCrossSoulOverlap(db, soul1.id, clusters);
		const allOverlaps = overlaps.flat();
		ok(allOverlaps.some((o) => o.soulId === soul2.id));
	});

	it('returns empty for empty cluster list', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const overlaps = computeCrossSoulOverlap(db, soul.id, []);
		strictEqual(overlaps.length, 0);
	});
});
