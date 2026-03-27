import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { clusterShards } from './cluster_shards.ts';
import { computeTraitAlignment } from './compute_trait_alignment.ts';
import { dropShard } from './drop_shard.ts';
import { listShards } from './list_shards.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('computeTraitAlignment', () => {
	it('returns novel for cluster with no trait overlap', () => {
		const soul = createSoul(db, { name: 'S', essence: 'ocean waves and tides', description: 'D' });
		addTrait(db, soul.id, {
			principle: 'Always document API changes thoroughly',
			provenance: 'E.',
		});
		dropShard(db, {
			content: 'The sunset painted the sky in vivid crimson and orange hues',
			source: 'test',
			soulIds: [soul.id],
		});
		const shards = listShards(db, { soulId: soul.id });
		const clusters = clusterShards(shards);
		const alignments = computeTraitAlignment(db, soul.id, clusters);
		strictEqual(alignments.length, clusters.length);
		strictEqual(alignments[0]?.kind, 'novel');
	});

	it('returns reinforcing for cluster overlapping with a trait', () => {
		const soul = createSoul(db, { name: 'S', essence: 'E', description: 'D' });
		addTrait(db, soul.id, {
			principle: 'Think carefully before acting on any ambiguous request',
			provenance: 'E.',
		});
		dropShard(db, {
			content: 'Carefully think before acting on ambiguous or unclear requests',
			source: 'test',
			soulIds: [soul.id],
		});
		const shards = listShards(db, { soulId: soul.id });
		const clusters = clusterShards(shards);
		const alignments = computeTraitAlignment(db, soul.id, clusters, { alignmentThreshold: 0.1 });
		const reinforcing = alignments.filter((a) => a.kind === 'reinforcing');
		ok(reinforcing.length > 0);
		if (reinforcing[0]?.kind === 'reinforcing') {
			ok(reinforcing[0].similarity > 0);
		}
	});

	it('returns empty array when no clusters', () => {
		const soul = createSoul(db, { name: 'S', essence: 'E', description: 'D' });
		const alignments = computeTraitAlignment(db, soul.id, []);
		strictEqual(alignments.length, 0);
	});
});
