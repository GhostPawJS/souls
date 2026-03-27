import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { citeShard } from './cite_shard.ts';
import { dropShard } from './drop_shard.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('citeShard', () => {
	it('links a shard to a trait', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P', provenance: 'Evidence.' });
		const { shard } = dropShard(db, {
			content: 'Observed careful planning.',
			source: 'test',
			soulIds: [soul.id],
		});

		const cited = citeShard(db, shard.id, trait.id);
		ok(cited.traitIds.includes(trait.id));
	});

	it('is idempotent', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P', provenance: 'Evidence.' });
		const { shard } = dropShard(db, {
			content: 'Observed careful planning.',
			source: 'test',
			soulIds: [soul.id],
		});

		citeShard(db, shard.id, trait.id);
		const cited = citeShard(db, shard.id, trait.id);
		strictEqual(cited.traitIds.length, 1);
	});
});
