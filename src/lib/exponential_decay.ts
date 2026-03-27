export const DEFAULT_SHARD_RELEVANCE_HALF_LIFE = 60;

export function exponentialDecay(
	ageDays: number,
	halfLife = DEFAULT_SHARD_RELEVANCE_HALF_LIFE,
): number {
	return Math.exp(-ageDays / halfLife);
}
