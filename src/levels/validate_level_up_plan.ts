import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import type { TraitRecord } from '../traits/types.ts';
import type { LevelUpPlan, LevelUpValidationError } from './types.ts';

export interface ValidationResult {
	valid: true;
}

export interface ValidationFailure {
	valid: false;
	error: LevelUpValidationError;
}

export function validateLevelUpPlan(
	db: SoulsDb,
	soulId: number,
	plan: LevelUpPlan,
): ValidationResult | ValidationFailure {
	if (!plan.newEssence || plan.newEssence.trim().length === 0) {
		throw new SoulsValidationError('Level-up plan must include a non-empty newEssence.');
	}

	// Gather all active trait IDs for this soul
	const activeRows = db
		.prepare(
			`SELECT id, principle, provenance FROM soul_traits WHERE soul_id = ? AND status = 'active'`,
		)
		.all<Pick<TraitRecord, 'id' | 'principle' | 'provenance'>>(soulId);
	const activeIds = new Set(activeRows.map((r) => r.id));

	// Collect all trait IDs referenced in the plan
	const consolidatedIds = plan.consolidations.flatMap((g) => g.sourceTraitIds);
	const allPlanIds = [...consolidatedIds, ...plan.promotedTraitIds, ...plan.carriedTraitIds];

	// Check for duplicates
	const seen = new Set<number>();
	const duplicateTraitIds: number[] = [];
	for (const id of allPlanIds) {
		if (seen.has(id)) duplicateTraitIds.push(id);
		seen.add(id);
	}

	// Check for invalid (non-active) IDs
	const invalidTraitIds = allPlanIds.filter((id) => !activeIds.has(id));

	// Check for missing (active traits not in plan)
	const missingTraitIds = [...activeIds].filter((id) => !seen.has(id));

	if (duplicateTraitIds.length > 0 || invalidTraitIds.length > 0 || missingTraitIds.length > 0) {
		return {
			valid: false,
			error: { missingTraitIds, duplicateTraitIds, invalidTraitIds },
		};
	}

	return { valid: true };
}
