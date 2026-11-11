export interface Cluster<T> {
	members: T[];
}

export function singleLinkageCluster<T>(
	items: T[],
	similarity: (a: T, b: T) => number,
	threshold: number,
): Cluster<T>[] {
	// Restart the pair scan after each merge, preserving single-linkage ordering.
	const clusters = items.map((item) => [item]);
	merge: for (;;) {
		for (let i = 0; i < clusters.length; i++) {
			for (let j = i + 1; j < clusters.length; j++) {
				const clusterI = clusters[i];
				const clusterJ = clusters[j];
				if (
					clusterI &&
					clusterJ &&
					clusterI.some((a) => clusterJ.some((b) => similarity(a, b) >= threshold))
				) {
					clusterI.push(...clusterJ);
					clusters.splice(j, 1);
					continue merge;
				}
			}
		}
		return clusters.map((members) => ({ members }));
	}
}
