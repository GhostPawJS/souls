import type { SoulsDb } from '../database.ts';
import { trigramJaccard } from '../lib/trigram_jaccard.ts';
import type { TraitSignal } from './types.ts';

const MS_PER_DAY = 86_400_000;
const DEFAULT_STALE_DAYS = 90;

export function computeTraitSignals(
	db: SoulsDb,
	soulId: number,
	options?: { staleDays?: number; now?: number },
): TraitSignal[] {
	const now = options?.now ?? Date.now();
	const staleDays = options?.staleDays ?? DEFAULT_STALE_DAYS;
	const staleMs = staleDays * MS_PER_DAY;

	const soul = db
		.prepare(`SELECT essence, created_at, level FROM souls WHERE id = ?`)
		.get<{ essence: string; created_at: number; level: number }>(soulId);
	if (!soul) return [];

	const soulAgeDays = Math.max(1, (now - soul.created_at) / MS_PER_DAY);

	const traits = db
		.prepare(
			`SELECT t.id AS traitId, t.principle, t.generation, t.created_at, t.updated_at,
			        COUNT(DISTINCT sc.shard_id) AS citationCount
			 FROM soul_traits t
			 LEFT JOIN shard_citations sc ON sc.trait_id = t.id
			 WHERE t.soul_id = ? AND t.status = 'active'
			 GROUP BY t.id`,
		)
		.all<{
			traitId: number;
			principle: string;
			generation: number;
			created_at: number;
			updated_at: number;
			citationCount: number;
		}>(soulId);

	return traits.map((t) => {
		// tenure: normalized 0..1 relative to soul age
		const traitAgeDays = (now - t.created_at) / MS_PER_DAY;
		const tenure = Math.min(1, traitAgeDays / soulAgeDays);

		// citationDensity: citations per day of trait age
		const citationDensity = t.citationCount / Math.max(1, traitAgeDays);

		// essenceRedundancy: trigram Jaccard between principle and essence
		const essenceRedundancy = trigramJaccard(t.principle, soul.essence);

		// stale: trait unchanged for more than staleDays
		const lastUpdated = Math.max(t.created_at, t.updated_at);
		const stale = now - lastUpdated > staleMs;

		// survivalCount: level-ups survived since trait was added
		const survivalCount = Math.max(0, soul.level - t.generation);

		return {
			traitId: t.traitId,
			principle: t.principle,
			tenure,
			citationCount: t.citationCount,
			citationDensity,
			essenceRedundancy,
			stale,
			survivalCount,
		};
	});
}
