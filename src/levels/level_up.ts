import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { resolveNow } from '../resolve_now.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { withTransaction } from '../with_transaction.ts';
import { getLevelHistory } from './get_level_history.ts';
import type { LevelUpPlan, LevelUpResult } from './types.ts';
import { validateLevelUpPlan } from './validate_level_up_plan.ts';

export function levelUp(
	db: SoulsDb,
	soulId: number,
	plan: LevelUpPlan,
	options?: { now?: number },
): LevelUpResult {
	const soul = getSoulOrThrow(db, soulId);
	const validation = validateLevelUpPlan(db, soulId, plan);

	if (!validation.valid) {
		const { missingTraitIds, duplicateTraitIds, invalidTraitIds } = validation.error;
		throw new SoulsValidationError(
			`Level-up plan is invalid. Missing: [${missingTraitIds}]. Duplicates: [${duplicateTraitIds}]. Invalid: [${invalidTraitIds}].`,
		);
	}

	const now = resolveNow(options?.now);
	const newLevel = soul.level + 1;

	return withTransaction(db, () => {
		const mergedTraitIds: number[] = [];

		// 1. Process consolidations: mark sources as consolidated, create merged traits
		for (const group of plan.consolidations) {
			const mergeResult = db
				.prepare(
					`INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
					 VALUES (?, ?, ?, ?, 'active', ?, ?)`,
				)
				.run(soulId, group.mergedPrinciple, group.mergedProvenance, newLevel, now, now);

			const mergedId = Number(mergeResult.lastInsertRowid);
			mergedTraitIds.push(mergedId);

			for (const srcId of group.sourceTraitIds) {
				db.prepare(
					`UPDATE soul_traits SET status = 'consolidated', merged_into = ?, updated_at = ? WHERE id = ?`,
				).run(mergedId, now, srcId);
			}
		}

		// 2. Mark promoted traits
		for (const traitId of plan.promotedTraitIds) {
			db.prepare(`UPDATE soul_traits SET status = 'promoted', updated_at = ? WHERE id = ?`).run(
				now,
				traitId,
			);
		}

		// 3. Bump generation on carried traits
		for (const traitId of plan.carriedTraitIds) {
			db.prepare(`UPDATE soul_traits SET generation = ?, updated_at = ? WHERE id = ?`).run(
				newLevel,
				now,
				traitId,
			);
		}

		// 4. Replace essence and bump soul level
		db.prepare(`UPDATE souls SET essence = ?, level = ?, updated_at = ? WHERE id = ?`).run(
			plan.newEssence,
			newLevel,
			now,
			soulId,
		);

		// 5. Record snapshot
		const allConsolidated = plan.consolidations.flatMap((g) => g.sourceTraitIds);
		const snapshotResult = db
			.prepare(
				`INSERT INTO soul_levels (soul_id, level, essence_before, essence_after, traits_consolidated, traits_promoted, traits_carried, traits_merged, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.run(
				soulId,
				newLevel,
				soul.essence,
				plan.newEssence,
				JSON.stringify(allConsolidated),
				JSON.stringify(plan.promotedTraitIds),
				JSON.stringify(plan.carriedTraitIds),
				JSON.stringify(mergedTraitIds),
				now,
			);

		const history = getLevelHistory(db, soulId);
		const snapshot = history.find((h) => h.id === Number(snapshotResult.lastInsertRowid));
		if (!snapshot) throw new SoulsValidationError('Level-up snapshot not found after insert.');

		return { level: newLevel, snapshot };
	});
}
