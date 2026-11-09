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

	const citations = db
		.prepare(
			`SELECT sc.shard_id, sc.trait_id FROM shard_citations sc JOIN soul_traits t ON t.id = sc.trait_id WHERE t.soul_id = ? AND t.status = 'active' ORDER BY sc.trait_id`,
		)
		.all<{ shard_id: number; trait_id: number }>(soulId);
	return clusters.map((cluster) => {
		const cited = citations.find((c) => cluster.members.some((m) => m.id === c.shard_id));
		if (cited)
			return {
				kind: 'reinforcing',
				traitId: cited.trait_id,
				similarity: Math.max(
					...cluster.members.map((m) =>
						trigramJaccard(m.content, traits.find((t) => t.id === cited.trait_id)?.principle ?? ''),
					),
				),
			};
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
