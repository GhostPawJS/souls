import type { TraitSignal, TraitTension } from './types.ts';

const NEGATION_PATTERNS = [
	/\bnot\b/i,
	/\bnever\b/i,
	/\bavoid\b/i,
	/\bdon'?t\b/i,
	/\brefuse\b/i,
	/\bwithout\b/i,
];

function isNegated(text: string): boolean {
	return NEGATION_PATTERNS.some((p) => p.test(text));
}

export function detectTraitTensions(traits: TraitSignal[]): TraitTension[] {
	const tensions: TraitTension[] = [];

	for (let i = 0; i < traits.length; i++) {
		for (let j = i + 1; j < traits.length; j++) {
			const a = traits[i];
			const b = traits[j];
			if (!a || !b) continue;

			const aNegated = isNegated(a.principle);
			const bNegated = isNegated(b.principle);

			// Asymmetric negation: one side negates, the other does not
			if (aNegated !== bNegated) {
				const aWords = new Set(a.principle.toLowerCase().split(/\W+/).filter(Boolean));
				const bWords = b.principle.toLowerCase().split(/\W+/).filter(Boolean);
				const shared = bWords.filter((w) => aWords.has(w) && w.length > 3).length;

				if (shared >= 2) {
					tensions.push({
						traitIdA: a.traitId,
						traitIdB: b.traitId,
						principleA: a.principle,
						principleB: b.principle,
						description: `Possible negation asymmetry: "${a.principle}" vs "${b.principle}"`,
					});
				}
			}
		}
	}

	return tensions;
}
