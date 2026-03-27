import type { SoulsDb } from '../database.ts';
import type { CrystallizationCheckOptions } from './check_crystallization_for_soul.ts';
import { checkCrystallizationForSoul } from './check_crystallization_for_soul.ts';
import type { CrystallizationRecord } from './types.ts';

export function crystallizationReadiness(
	db: SoulsDb,
	options?: CrystallizationCheckOptions,
): CrystallizationRecord[] {
	// Get all active (non-dormant) soul IDs
	const souls = db.prepare(`SELECT id FROM souls WHERE deleted_at IS NULL`).all<{ id: number }>();

	const results: CrystallizationRecord[] = [];

	for (const { id: soulId } of souls) {
		const check = checkCrystallizationForSoul(db, soulId, options);
		if (check === null) continue;

		results.push({
			soulId,
			pendingCount: check.pendingCount,
			sourceDiversity: check.sourceDiversity,
			ageSpreadDays: check.ageSpreadDays,
			clusterCount: check.clusterCount,
			priorityScore: check.priorityScore,
		});
	}

	return results.sort((a, b) => b.priorityScore - a.priorityScore);
}
