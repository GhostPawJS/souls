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
 * All members are compared via trigram Jaccard, taking the maximum similarity
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

		let bestTrait: { traitId: number; similarity: number } | null = null;
		for (const trait of traits) {
			const sim = Math.max(
				...cluster.members.map((member) => trigramJaccard(member.content, trait.principle)),
			);
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
