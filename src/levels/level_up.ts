import { resolveReadiness, resolveStrict } from '../config.ts';
import type { SoulsDb } from '../database.ts';
import { SoulsStateError, SoulsValidationError } from '../errors.ts';
import { resolveNow } from '../resolve_now.ts';
import { recordRevision } from '../revisions.ts';
import {
	type CrystallizationCheckOptions,
	checkCrystallizationForSoul,
} from '../shards/check_crystallization_for_soul.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { insertTrait } from '../traits/insert_trait.ts';
import { withTransaction } from '../with_transaction.ts';
import { getLevelHistory } from './get_level_history.ts';
import type { LevelUpPlan, LevelUpResult } from './types.ts';
import { validateLevelUpPlan } from './validate_level_up_plan.ts';

export function levelUp(
	db: SoulsDb,
	soulId: number,
	plan: LevelUpPlan,
	options?: CrystallizationCheckOptions & { strict?: boolean; traitLimit?: number },
): LevelUpResult {
	const soul = getSoulOrThrow(db, soulId);
	const validation = validateLevelUpPlan(db, soulId, plan, options);

	if (!validation.valid) {
		const { missingTraitIds, duplicateTraitIds, invalidTraitIds } = validation.error;
		throw new SoulsValidationError(
			`${validation.errors?.join(' ') ?? ''} Level-up plan is invalid. Missing: [${missingTraitIds}]. Duplicates: [${duplicateTraitIds}]. Invalid: [${invalidTraitIds}].`,
		);
	}

	if (
		resolveReadiness(db, options?.readiness) !== 'legacy' &&
		resolveStrict(db, options?.strict) &&
		!checkCrystallizationForSoul(db, soulId, options)?.ready
	)
		throw new SoulsStateError(`Soul ${soulId} is not crystallization-ready.`);
	const now = resolveNow(options?.now);
	const newLevel = soul.level + 1;

	return withTransaction(db, () => {
		const mergedTraitIds: number[] = [];
		const stateBefore = JSON.stringify(
			db.prepare('SELECT * FROM soul_traits WHERE soul_id = ?').all(soulId),
		);
		recordRevision(db, 'essence', soulId, soulId, soul.essence, plan.newEssence, {
			now,
			reason: 'level up',
		});

		// 1. Process consolidations: mark sources as consolidated, create merged traits
		for (const group of plan.consolidations) {
			const mergedId = insertTrait(
				db,
				soulId,
				group.mergedPrinciple,
				group.mergedProvenance,
				newLevel,
				now,
			);
			mergedTraitIds.push(mergedId);
			recordRevision(db, 'trait', mergedId, soulId, null, group.mergedPrinciple, {
				now,
				reason: 'level up merge',
			});

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

		// Level-up currently fades no shards; record the empty set explicitly for faithful rollback.
		db.prepare('UPDATE soul_levels SET faded_shard_ids = ?, state_before = ? WHERE id = ?').run(
			'[]',
			stateBefore,
			Number(snapshotResult.lastInsertRowid),
		);

		const history = getLevelHistory(db, soulId);
		const snapshot = history.find((h) => h.id === Number(snapshotResult.lastInsertRowid));
		if (!snapshot) throw new SoulsValidationError('Level-up snapshot not found after insert.');

		return {
			level: newLevel,
			snapshot,
			...(validation.warnings?.length ? { warnings: validation.warnings } : {}),
		};
	});
}
