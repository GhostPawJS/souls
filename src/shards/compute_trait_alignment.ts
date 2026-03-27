import type { SoulsDb } from '../database.ts';
import { trigramJaccard } from '../lib/trigram_jaccard.ts';
import type { EvidenceCluster, TraitAlignment } from './types.ts';

const DEFAULT_ALIGNMENT_THRESHOLD = 0.15;

interface ActiveTrait {
	id: number;
	principle: string;
}

/**
 * For each cluster, compute shard-trait alignment.
 * The representative shard (first member, as a proxy) is compared via trigram Jaccard
 * against each active trait principle. Clusters with overlap above the threshold
 * are labeled `reinforcing`; those below are labeled `novel`.
 */
export function computeTraitAlignment(
	db: SoulsDb,
	soulId: number,
	clusters: EvidenceCluster[],
	options?: { alignmentThreshold?: number },
): TraitAlignment[] {
	const threshold = options?.alignmentThreshold ?? DEFAULT_ALIGNMENT_THRESHOLD;

	const traits = db
		.prepare(`SELECT id, principle FROM soul_traits WHERE soul_id = ? AND status = 'active'`)
		.all<ActiveTrait>(soulId);

	return clusters.map((cluster) => {
		if (cluster.members.length === 0) {
			return { kind: 'novel' };
		}

		// Use the first member as the cluster representative
		const rep = (cluster.members[0] as (typeof cluster.members)[number]).content;

		let bestTrait: { traitId: number; similarity: number } | null = null;
		for (const trait of traits) {
			const sim = trigramJaccard(rep, trait.principle);
			if (sim >= threshold && (bestTrait === null || sim > bestTrait.similarity)) {
				bestTrait = { traitId: trait.id, similarity: sim };
			}
		}

		if (bestTrait !== null) {
			return { kind: 'reinforcing', traitId: bestTrait.traitId, similarity: bestTrait.similarity };
		}
		return { kind: 'novel' };
	});
}
