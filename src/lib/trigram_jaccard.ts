import { trigramSet } from './trigram_set.ts';

export function trigramJaccard(a: string, b: string): number {
	if (a === b) return 1;
	const setA = trigramSet(a);
	const setB = trigramSet(b);
	if (setA.size === 0 && setB.size === 0) return 1;
	if (setA.size === 0 || setB.size === 0) return 0;

	let intersection = 0;
	for (const tri of setA) {
		if (setB.has(tri)) intersection++;
	}
	const union = setA.size + setB.size - intersection;
	return intersection / union;
}
