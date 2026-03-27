export interface Cluster<T> {
	members: T[];
}

export function singleLinkageCluster<T>(
	items: T[],
	similarity: (a: T, b: T) => number,
	threshold: number,
): Cluster<T>[] {
	if (items.length === 0) return [];

	// Start with each item in its own cluster
	const clusters: T[][] = items.map((item) => [item]);

	let merged = true;
	while (merged) {
		merged = false;
		outer: for (let i = 0; i < clusters.length; i++) {
			for (let j = i + 1; j < clusters.length; j++) {
				// Single-linkage: any pair of members above threshold triggers merge
				const clusterI = clusters[i];
				const clusterJ = clusters[j];
				if (!clusterI || !clusterJ) continue;

				let shouldMerge = false;
				for (const a of clusterI) {
					for (const b of clusterJ) {
						if (similarity(a, b) >= threshold) {
							shouldMerge = true;
							break;
						}
					}
					if (shouldMerge) break;
				}

				if (shouldMerge) {
					clusterI.push(...clusterJ);
					clusters.splice(j, 1);
					merged = true;
					break outer;
				}
			}
		}
	}

	return clusters.map((members) => ({ members }));
}
