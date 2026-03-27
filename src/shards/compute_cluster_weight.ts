import type { ShardRecord } from './types.ts';

const MS_PER_DAY = 86_400_000;
const HALF_LIFE_DAYS = 60;

export function computeClusterWeight(members: ShardRecord[], now = Date.now()): number {
	const sources = new Set(members.map((s) => s.source));
	const sourceDiversity = sources.size;
	const ages = members.map((s) => (now - s.createdAt) / MS_PER_DAY);
	const avgFreshness =
		ages.reduce((sum, age) => sum + Math.exp(-age / HALF_LIFE_DAYS), 0) / ages.length;
	return members.length * sourceDiversity * avgFreshness;
}
