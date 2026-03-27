import type { PromotionCandidate, TraitSignal } from './types.ts';

/**
 * Rank active traits by promotion score:
 * promotionScore = tenure × citationDensity × essenceRedundancy
 *
 * High-scoring traits are old, well-evidenced, AND already partially echoed
 * in the essence — strong candidates for absorption into the narrative.
 * Returns only traits with a non-zero score, sorted descending.
 */
export function computePromotionCandidates(signals: TraitSignal[]): PromotionCandidate[] {
	return signals
		.map((sig) => ({
			traitId: sig.traitId,
			principle: sig.principle,
			score: sig.tenure * sig.citationDensity * sig.essenceRedundancy,
		}))
		.filter((c) => c.score > 0)
		.sort((a, b) => b.score - a.score);
}
