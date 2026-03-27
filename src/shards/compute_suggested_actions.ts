import type {
	ConsolidationSuggestion,
	EvidenceCluster,
	PromotionCandidate,
	TraitSignal,
} from './types.ts';

const DEFAULT_TRAIT_LIMIT = 10;
const DEFAULT_REDUNDANCY_THRESHOLD = 0.3;

export interface SuggestedActionsInput {
	traitSignals: TraitSignal[];
	clusters: EvidenceCluster[];
	consolidationSuggestions: ConsolidationSuggestion[];
	promotionCandidates: PromotionCandidate[];
	traitLimit?: number | undefined;
	redundancyThreshold?: number | undefined;
}

/**
 * Deterministic list of suggested actions derived from evidence signals.
 * Used in evidence reports as a pre-digested human/LLM action queue.
 */
export function computeSuggestedActions(input: SuggestedActionsInput): string[] {
	const {
		traitSignals,
		clusters,
		consolidationSuggestions,
		promotionCandidates,
		traitLimit = DEFAULT_TRAIT_LIMIT,
		redundancyThreshold = DEFAULT_REDUNDANCY_THRESHOLD,
	} = input;

	const actions: string[] = [];

	// Stale traits
	const staleCount = traitSignals.filter((s) => s.stale).length;
	if (staleCount > 0) {
		actions.push(
			`${staleCount} trait${staleCount === 1 ? '' : 's'} flagged stale — review for revision or revert`,
		);
	}

	// Traits redundant with essence
	const redundantCount = traitSignals.filter(
		(s) => s.essenceRedundancy > redundancyThreshold,
	).length;
	if (redundantCount > 0) {
		actions.push(
			`${redundantCount} trait${redundantCount === 1 ? '' : 's'} redundant with essence — consider promoting or removing`,
		);
	}

	// Unaligned (novel) clusters
	const novelCount = clusters.filter((c) => c.alignment.kind === 'novel').length;
	if (novelCount > 0) {
		const totalMembers = clusters
			.filter((c) => c.alignment.kind === 'novel')
			.reduce((sum, c) => sum + c.members.length, 0);
		actions.push(
			`${novelCount} cluster${novelCount === 1 ? '' : 's'} (${totalMembers} shard${totalMembers === 1 ? '' : 's'}) not aligned with any trait — consider adding a new trait`,
		);
	}

	// At capacity
	const activeCount = traitSignals.length;
	if (activeCount >= traitLimit) {
		actions.push(`Soul at trait capacity (${activeCount}/${traitLimit}) — level-up recommended`);
	}

	// Consolidation candidates
	const consolidationCount = consolidationSuggestions.length;
	if (consolidationCount > 0) {
		actions.push(
			`${consolidationCount} trait pair${consolidationCount === 1 ? '' : 's'} are consolidation candidates`,
		);
	}

	// Promotion candidates
	const topPromotions = promotionCandidates.slice(0, 3);
	if (topPromotions.length > 0) {
		actions.push(
			`${topPromotions.length} trait${topPromotions.length === 1 ? '' : 's'} are strong promotion candidates (old, evidenced, overlaps essence)`,
		);
	}

	return actions;
}
