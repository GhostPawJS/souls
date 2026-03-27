import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from './database.ts';
import { createInitializedSoulsDb } from './lib/test-db.ts';
import { runMaintenance } from './maintenance.ts';
import { citeShard } from './shards/cite_shard.ts';
import { dropShard } from './shards/drop_shard.ts';
import { getShardOrThrow } from './shards/get_shard_or_throw.ts';
import { createSoul } from './souls/create_soul.ts';
import { addTrait } from './traits/add_trait.ts';

const DAY = 86_400_000;

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('runMaintenance', () => {
	it('returns zero fadedShardCount when no shards are exhausted', () => {
		const result = runMaintenance(db);
		strictEqual(result.fadedShardCount, 0);
		strictEqual(result.readySouls.length, 0);
	});

	it('fades exhausted shards and returns count', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const t1 = addTrait(db, soul.id, { principle: 'P1', provenance: 'E.' });
		const t2 = addTrait(db, soul.id, { principle: 'P2', provenance: 'E.' });
		const { shard } = dropShard(db, {
			content: 'Shared observation.',
			source: 'test',
			soulIds: [soul.id],
		});
		citeShard(db, shard.id, t1.id);
		citeShard(db, shard.id, t2.id);

		const result = runMaintenance(db, { fadeCitationThreshold: 2 });
		strictEqual(result.fadedShardCount, 1);
		strictEqual(getShardOrThrow(db, shard.id).status, 'faded');
	});

	it('returns ready souls in crystallization readiness result', () => {
		const soul = createSoul(db, { name: 'B', essence: 'E', description: 'D', now: DAY });
		const contents = [
			'the agent deliberated carefully before acting on the request',
			'delegation produced an error in docker context setup today',
			'communication style needs improvement in technical explanations',
		];
		for (let i = 0; i < 3; i++) {
			dropShard(db, {
				content: contents[i]!,
				source: i === 0 ? 'src_a' : 'src_b',
				soulIds: [soul.id],
				now: (i + 2) * DAY,
			});
		}
		const result = runMaintenance(db, { crystallizationThreshold: 3, now: 10 * DAY });
		ok(result.readySouls.length > 0);
		ok(result.readySouls.some((r) => r.soulId === soul.id));
	});
});
