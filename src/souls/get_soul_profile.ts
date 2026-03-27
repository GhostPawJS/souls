import type { SoulsDb } from '../database.ts';
import type { CrystallizationCheckOptions } from '../shards/check_crystallization_for_soul.ts';
import { checkCrystallizationForSoul } from '../shards/check_crystallization_for_soul.ts';
import { pendingShardCount } from '../shards/pending_shard_count.ts';
import { DEFAULT_TRAIT_LIMIT, getTraitLimit } from '../traits/get_trait_limit.ts';
import { listTraits } from '../traits/list_traits.ts';
import type { TraitRecord } from '../traits/types.ts';
import { getSoulOrThrow } from './get_soul_or_throw.ts';
import type { SoulRecord } from './types.ts';

export interface SoulProfile {
	soul: SoulRecord;
	activeTraits: TraitRecord[];
	activeTraitCount: number;
	traitLimit: number;
	atCapacity: boolean;
	pendingShardCount: number;
	crystallizationReady: boolean;
	health: number;
}

export interface GetSoulProfileOptions extends CrystallizationCheckOptions {
	traitLimit?: number | undefined;
}

/**
 * Returns the full state picture for one soul in a single call:
 * record, active traits, capacity state, pending shard count,
 * crystallization readiness, and a composite health score.
 *
 * health = (1 - avgStaleness) × (1 - activeCount/traitLimit) × min(1, pendingCount/crystallizationThreshold)
 * Range 0..1. Combines trait freshness, capacity headroom, and evidence availability.
 */
export function getSoulProfile(
	db: SoulsDb,
	soulId: number,
	options?: GetSoulProfileOptions,
): SoulProfile {
	const soul = getSoulOrThrow(db, soulId);
	const traitLimit = getTraitLimit({ traitLimit: options?.traitLimit ?? DEFAULT_TRAIT_LIMIT });
	const activeTraits = listTraits(db, soulId, { status: 'active' });
	const activeTraitCount = activeTraits.length;
	const atCapacity = activeTraitCount >= traitLimit;
	const pending = pendingShardCount(db, soulId);
	const check = checkCrystallizationForSoul(db, soulId, options);
	const crystallizationReady = check !== null;

	// Health computation
	const now = options?.now ?? Date.now();
	const MS_PER_DAY = 86_400_000;
	const staleDays = 90;
	const staleMs = staleDays * MS_PER_DAY;
	let avgStaleness = 0;
	if (activeTraits.length > 0) {
		const stalenessValues: number[] = activeTraits.map((t) => {
			const lastUpdated = Math.max(t.createdAt, t.updatedAt);
			return now - lastUpdated > staleMs ? 1 : 0;
		});
		avgStaleness = stalenessValues.reduce((s, v) => s + v, 0) / activeTraits.length;
	}
	const threshold = options?.crystallizationThreshold ?? 3;
	const health =
		(1 - avgStaleness) *
		(1 - activeTraitCount / traitLimit) *
		Math.min(1, pending / Math.max(1, threshold));

	return {
		soul,
		activeTraits,
		activeTraitCount,
		traitLimit,
		atCapacity,
		pendingShardCount: pending,
		crystallizationReady,
		health: Math.max(0, Math.min(1, health)),
	};
}
