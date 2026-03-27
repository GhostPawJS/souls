import { trigramJaccard } from '../lib/trigram_jaccard.ts';
import type { ConsolidationSuggestion, TraitSignal } from './types.ts';

const DEFAULT_SIMILARITY_THRESHOLD = 0.3;

export function suggestConsolidations(
	traits: TraitSignal[],
	options?: { threshold?: number },
): ConsolidationSuggestion[] {
	const threshold = options?.threshold ?? DEFAULT_SIMILARITY_THRESHOLD;
	const suggestions: ConsolidationSuggestion[] = [];

	for (let i = 0; i < traits.length; i++) {
		for (let j = i + 1; j < traits.length; j++) {
			const a = traits[i];
			const b = traits[j];
			if (!a || !b) continue;

			const similarity = trigramJaccard(a.principle, b.principle);
			if (similarity >= threshold) {
				suggestions.push({
					traitIds: [a.traitId, b.traitId],
					principles: [a.principle, b.principle],
					similarity,
				});
			}
		}
	}

	return suggestions.sort((a, b) => b.similarity - a.similarity);
}
