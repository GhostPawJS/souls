import type { SoulsDb } from './database.ts';
import type { CrystallizationCheckOptions } from './shards/check_crystallization_for_soul.ts';
import { crystallizationReadiness } from './shards/crystallization_readiness.ts';
import { fadeExhaustedShards } from './shards/fade_exhausted_shards.ts';
import type { CrystallizationRecord } from './shards/types.ts';

export interface MaintenanceOptions extends CrystallizationCheckOptions {
	fadeCitationThreshold?: number | undefined;
}

export interface MaintenanceResult {
	fadedShardCount: number;
	readySouls: CrystallizationRecord[];
}

/**
 * One-call maintenance cycle:
 * 1. Fade exhausted shards (cited by fadeCitationThreshold distinct traits)
 * 2. Return crystallization readiness for all active souls
 *
 * The consumer runs this on a schedule (or before each refinement check).
 * Zero tokens. Sub-millisecond for typical databases.
 */
export function runMaintenance(db: SoulsDb, options?: MaintenanceOptions): MaintenanceResult {
	const fadeOptions: { fadeCitationThreshold?: number; now?: number } = {};
	if (options?.fadeCitationThreshold !== undefined) {
		fadeOptions.fadeCitationThreshold = options.fadeCitationThreshold;
	}
	if (options?.now !== undefined) {
		fadeOptions.now = options.now;
	}
	const fadedShardCount = fadeExhaustedShards(db, fadeOptions);

	const readySouls = crystallizationReadiness(db, options);

	return { fadedShardCount, readySouls };
}
