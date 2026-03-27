import type { SoulsDb } from '../database.ts';
import { resolveNow } from '../resolve_now.ts';
import { withTransaction } from '../with_transaction.ts';
import type { CrystallizationCheckOptions } from './check_crystallization_for_soul.ts';
import { checkCrystallizationForSoul } from './check_crystallization_for_soul.ts';
import { dropShard } from './drop_shard.ts';
import type { DropShardInput, DropShardsResult } from './types.ts';

export function dropShards(
	db: SoulsDb,
	inputs: DropShardInput[],
	options?: CrystallizationCheckOptions,
): DropShardsResult {
	if (inputs.length === 0) return { shards: [], crystallizationTriggers: [] };

	return withTransaction(db, () => {
		// Insert all shards without running crystallization check per-shard
		const shards = inputs.map(
			(input) => dropShard(db, input, { crystallizationThreshold: Infinity }).shard,
		);

		// One crystallization check across all unique soul IDs after all inserts
		const allSoulIds = new Set(inputs.flatMap((i) => i.soulIds));
		const now = resolveNow(options?.now);
		const crystallizationTriggers: number[] = [];

		for (const soulId of allSoulIds) {
			const check = checkCrystallizationForSoul(db, soulId, { ...options, now });
			if (check !== null) crystallizationTriggers.push(soulId);
		}

		return { shards, crystallizationTriggers };
	});
}
