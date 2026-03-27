import { singleLinkageCluster } from '../lib/single_linkage_cluster.ts';
import { trigramJaccard } from '../lib/trigram_jaccard.ts';
import type { EvidenceCluster, ShardRecord } from './types.ts';

const DEFAULT_CLUSTER_THRESHOLD = 0.4;
const MS_PER_DAY = 86_400_000;

export function clusterShards(
	shards: ShardRecord[],
	options?: { threshold?: number; now?: number },
): EvidenceCluster[] {
	const threshold = options?.threshold ?? DEFAULT_CLUSTER_THRESHOLD;
	const now = options?.now ?? Date.now();

	const clusters = singleLinkageCluster(
		shards,
		(a, b) => trigramJaccard(a.content, b.content),
		threshold,
	);

	return clusters.map((cluster) => {
		const members = cluster.members;
		const sources = new Set(members.map((s) => s.source));
		const sourceDiversity = sources.size;

		const ages = members.map((s) => (now - s.createdAt) / MS_PER_DAY);
		const avgFreshness = ages.reduce((sum, age) => sum + Math.exp(-age / 60), 0) / ages.length;

		const weight = members.length * sourceDiversity * avgFreshness;

		return {
			members,
			weight,
			sourceDiversity,
			avgFreshness,
			alignment: { kind: 'novel' as const },
			sharedWith: [],
		};
	});
}
