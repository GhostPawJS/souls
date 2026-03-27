import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { citeShard } from './cite_shard.ts';
import { dropShard } from './drop_shard.ts';
import { fadeExhaustedShards } from './fade_exhausted_shards.ts';
import { getShardOrThrow } from './get_shard_or_throw.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('fadeExhaustedShards', () => {
	it('fades shards cited by enough distinct traits (default threshold = 2)', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		const t2 = addTrait(db, soul.id, { principle: 'P2', provenance: 'E.' });

		const { shard } = dropShard(db, {
			content: 'Observed careful planning.',
			source: 'test',
			soulIds: [soul.id],
		});

		citeShard(db, shard.id, t1.id);
		citeShard(db, shard.id, t2.id);

		const faded = fadeExhaustedShards(db);
		strictEqual(faded, 1);
		strictEqual(getShardOrThrow(db, shard.id).status, 'faded');
	});

	it('does not fade shards cited by fewer distinct traits than threshold', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });

		const { shard } = dropShard(db, {
			content: 'Observed careful planning.',
			source: 'test',
			soulIds: [soul.id],
		});

		citeShard(db, shard.id, t1.id);

		const faded = fadeExhaustedShards(db);
		strictEqual(faded, 0);
		strictEqual(getShardOrThrow(db, shard.id).status, 'pending');
	});

	it('respects custom fadeCitationThreshold', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		const t2 = addTrait(db, soul.id, { principle: 'P2', provenance: 'E.' });
		const t3 = addTrait(db, soul.id, { principle: 'P3', provenance: 'E.' });

		const { shard } = dropShard(db, {
			content: 'Observed careful planning.',
			source: 'test',
			soulIds: [soul.id],
		});

		citeShard(db, shard.id, t1.id);
		citeShard(db, shard.id, t2.id);
		// Only 2 citations — should not fade with threshold=3
		const notFaded = fadeExhaustedShards(db, { fadeCitationThreshold: 3 });
		strictEqual(notFaded, 0);

		citeShard(db, shard.id, t3.id);
		const faded = fadeExhaustedShards(db, { fadeCitationThreshold: 3 });
		strictEqual(faded, 1);
	});

	it('fades globally across all souls', () => {
		const soul1 = createSoul(db, { name: 'S1', essence: 'E', description: 'D' });
		const soul2 = createSoul(db, { name: 'S2', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul1.id, { principle: 'P1', provenance: 'E.' });
		const t2 = addTrait(db, soul2.id, { principle: 'P2', provenance: 'E.' });

		// Shard attributed to both souls
		const { shard } = dropShard(db, {
			content: 'Shared observation.',
			source: 'test',
			soulIds: [soul1.id, soul2.id],
		});

		citeShard(db, shard.id, t1.id);
		citeShard(db, shard.id, t2.id);

		const faded = fadeExhaustedShards(db);
		strictEqual(faded, 1);
	});
});
