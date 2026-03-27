import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { computeTraitSignals } from './compute_trait_signals.ts';

const DAY = 86_400_000;

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('computeTraitSignals', () => {
	it('returns empty for soul with no active traits', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D', now: DAY });
		strictEqual(computeTraitSignals(db, soul.id, { now: 10 * DAY }).length, 0);
	});

	it('returns empty for non-existent soul', () => {
		strictEqual(computeTraitSignals(db, 99999, { now: 10 * DAY }).length, 0);
	});

	it('returns signals with all expected fields', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D', now: DAY });
		addTrait(db, soul.id, {
			principle: 'Think carefully before acting.',
			provenance: 'Evidence.',
			now: 2 * DAY,
		});

		const signals = computeTraitSignals(db, soul.id, { now: 10 * DAY });
		strictEqual(signals.length, 1);
		const sig = signals[0]!;
		ok('traitId' in sig);
		ok('principle' in sig);
		ok('tenure' in sig);
		ok('citationCount' in sig);
		ok('citationDensity' in sig);
		ok('essenceRedundancy' in sig);
		ok('stale' in sig);
		ok('survivalCount' in sig);
	});

	it('tenure is normalized 0..1 relative to soul age', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D', now: DAY });
		addTrait(db, soul.id, { principle: 'P1', provenance: 'E.', now: 5 * DAY });
		const signals = computeTraitSignals(db, soul.id, { now: 10 * DAY });
		const sig = signals[0]!;
		ok(sig.tenure >= 0 && sig.tenure <= 1, `tenure should be 0..1, got ${sig.tenure}`);
	});

	it('stale is true when trait unchanged beyond staleDays', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D', now: DAY });
		addTrait(db, soul.id, { principle: 'P1', provenance: 'E.', now: DAY });
		const signals = computeTraitSignals(db, soul.id, { staleDays: 5, now: 10 * DAY });
		ok(signals[0]!.stale === true);
	});

	it('stale is false for recently updated trait', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D', now: DAY });
		addTrait(db, soul.id, { principle: 'P1', provenance: 'E.', now: 9 * DAY });
		const signals = computeTraitSignals(db, soul.id, { staleDays: 30, now: 10 * DAY });
		ok(signals[0]!.stale === false);
	});

	it('survivalCount reflects level-ups since trait was added', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D', now: DAY });
		addTrait(db, soul.id, { principle: 'P1', provenance: 'E.', now: 2 * DAY });
		// Manually bump soul level to simulate 2 level-ups
		db.prepare(`UPDATE souls SET level = 3 WHERE id = ?`).run(soul.id);
		const signals = computeTraitSignals(db, soul.id, { now: 10 * DAY });
		// trait added at generation 1, soul now at level 3: survivalCount = 3 - 1 = 2
		strictEqual(signals[0]!.survivalCount, 2);
	});
});
