import { resolveStrict } from '../config.ts';
import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { trigramJaccard } from '../lib/trigram_jaccard.ts';
import { traceEdges } from '../traces/trace_edges.ts';
import { traceTablesExist } from '../traces/trace_tables_exist.ts';
import { getTraitLimit } from '../traits/get_trait_limit.ts';
import type { TraitRecord } from '../traits/types.ts';
import type { LevelUpPlan, LevelUpValidationError } from './types.ts';

export interface ValidationResult {
	traceBackedCount?: { traitId: number; count: number }[];
	valid: true;
	warnings?: string[];
	errors?: string[];
}

export interface ValidationFailure {
	traceBackedCount?: { traitId: number; count: number }[];
	valid: false;
	warnings?: string[];
	errors?: string[];
	error: LevelUpValidationError;
}

export function validateLevelUpPlan(
	db: SoulsDb,
	soulId: number,
	plan: LevelUpPlan,
	options?: { strict?: boolean; traitLimit?: number },
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

	const warnings: string[] = [];
	const errors: string[] = [];
	const limit = getTraitLimit(options);
	const resultingCount = plan.carriedTraitIds.length + plan.consolidations.length;
	if (resultingCount > limit && resultingCount >= activeRows.length)
		errors.push(`Resulting active trait count ${resultingCount} exceeds trait limit ${limit}.`);
	if (activeRows.length >= limit && resultingCount > activeRows.length)
		errors.push('Cannot increase active traits while at or above the trait limit.');
	for (const group of plan.consolidations) {
		if (!group.sourceTraitIds.length) errors.push('Consolidation groups must not be empty.');
		if (!group.mergedPrinciple?.trim() || !group.mergedProvenance?.trim())
			errors.push('Merged principle and provenance must be non-empty.');
		const members = activeRows.filter((t) => group.sourceTraitIds.includes(t.id));
		if (
			members.length < 2 ||
			members.some((a, i) =>
				members.slice(i + 1).some((b) => trigramJaccard(a.principle, b.principle) < 0.15),
			)
		)
			warnings.push('Weak consolidation: source traits have little wording overlap.');
	}
	const level =
		db.prepare('SELECT level FROM souls WHERE id = ?').get<{ level: number }>(soulId)?.level ?? 1;
	for (const id of plan.promotedTraitIds) {
		const trait = db
			.prepare('SELECT generation FROM soul_traits WHERE id = ?')
			.get<{ generation: number }>(id);
		if (trait && level - trait.generation < 2)
			warnings.push(`Premature promotion: trait ${id} has survived fewer than two level-ups.`);
	}
	if (duplicateTraitIds.length > 0 || invalidTraitIds.length > 0 || missingTraitIds.length > 0) {
		return {
			valid: false,
			error: { missingTraitIds, duplicateTraitIds, invalidTraitIds },
			...(errors.length ? { errors } : {}),
			...(warnings.length || errors.length ? { warnings: [...warnings, ...errors] } : {}),
		};
	}

	if (errors.length && resolveStrict(db, options?.strict))
		return {
			valid: false,
			error: { missingTraitIds: [], duplicateTraitIds: [], invalidTraitIds: [] },
			errors,
			warnings,
		};
	return {
		...(traceTablesExist(db)
			? {
					traceBackedCount: plan.carriedTraitIds.map((traitId) => ({
						traitId,
						count:
							db
								.prepare(
									`SELECT count(DISTINCT c.shard_id) AS n FROM shard_citations c JOIN shard_traces st ON st.shard_id=c.shard_id JOIN soul_traces t ON t.id=st.trace_id WHERE c.trait_id=? AND t.state IN (0,1) AND NOT EXISTS (SELECT 1 FROM (${traceEdges(db)}) n WHERE n.parent=t.id)`,
								)
								.get<{ n: number }>(traitId)?.n ?? 0,
					})),
				}
			: {}),
		valid: true,
		...(errors.length ? { errors } : {}),
		...(warnings.length || errors.length ? { warnings: [...warnings, ...errors] } : {}),
	};
}
