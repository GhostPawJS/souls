export const DEFAULT_TRAIT_LIMIT = 10;

export function getTraitLimit(options?: { traitLimit?: number }): number {
	return options?.traitLimit ?? DEFAULT_TRAIT_LIMIT;
}
