import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { addTrait } from '../traits/add_trait.ts';
import { createSoul } from './create_soul.ts';
import { getSoulProfile } from './get_soul_profile.ts';

const DAY = 86_400_000;

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('getSoulProfile', () => {
	it('returns basic profile for a fresh soul', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const profile = getSoulProfile(db, soul.id);

		strictEqual(profile.soul.id, soul.id);
		strictEqual(profile.activeTraitCount, 0);
		strictEqual(profile.pendingShardCount, 0);
		strictEqual(profile.crystallizationReady, false);
		ok(profile.health >= 0 && profile.health <= 1);
	});

	it('reflects active traits correctly', () => {
		const soul = createSoul(db, { name: 'B', essence: 'E', description: 'D' });
		addTrait(db, soul.id, { principle: 'P1', provenance: 'Evidence.' });
		addTrait(db, soul.id, { principle: 'P2', provenance: 'Evidence.' });

		const profile = getSoulProfile(db, soul.id);
		strictEqual(profile.activeTraitCount, 2);
		strictEqual(profile.activeTraits.length, 2);
		strictEqual(profile.atCapacity, false);
	});

	it('atCapacity is true when active traits equal traitLimit', () => {
		const soul = createSoul(db, { name: 'C', essence: 'E', description: 'D' });
		for (let i = 0; i < 3; i++) {
			addTrait(db, soul.id, { principle: `P${i}`, provenance: 'E.' });
		}
		const profile = getSoulProfile(db, soul.id, { traitLimit: 3 });
		strictEqual(profile.atCapacity, true);
	});

	it('crystallizationReady is true when all conditions are met', () => {
		const soul = createSoul(db, { name: 'D', essence: 'E', description: 'D', now: DAY });
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
		const profile = getSoulProfile(db, soul.id, { crystallizationThreshold: 3, now: 10 * DAY });
		strictEqual(profile.crystallizationReady, true);
	});

	it('throws SoulsNotFoundError for unknown id', () => {
		try {
			getSoulProfile(db, 99999);
			throw new Error('Should have thrown');
		} catch (e) {
			ok(
				(e as Error).message.includes('not found') ||
					(e as Error).constructor.name === 'SoulsNotFoundError',
			);
		}
	});
});
