import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computePromotionCandidates } from './compute_promotion_candidates.ts';
import type { TraitSignal } from './types.ts';

function makeSignal(
	id: number,
	tenure: number,
	citationDensity: number,
	essenceRedundancy: number,
): TraitSignal {
	return {
		traitId: id,
		principle: `Principle ${id}`,
		tenure,
		citationCount: 1,
		citationDensity,
		essenceRedundancy,
		stale: false,
		survivalCount: 0,
	};
}

describe('computePromotionCandidates', () => {
	it('returns empty for empty input', () => {
		strictEqual(computePromotionCandidates([]).length, 0);
	});

	it('returns empty when all scores are zero', () => {
		const signals = [makeSignal(1, 0.5, 0, 0.3), makeSignal(2, 0.3, 0.2, 0)];
		strictEqual(computePromotionCandidates(signals).length, 0);
	});

	it('returns candidates sorted by score descending', () => {
		const signals = [
			makeSignal(1, 0.5, 0.1, 0.3), // score = 0.015
			makeSignal(2, 0.8, 0.2, 0.4), // score = 0.064
			makeSignal(3, 0.3, 0.05, 0.1), // score = 0.0015
		];
		const candidates = computePromotionCandidates(signals);
		strictEqual(candidates.length, 3);
		ok(candidates[0]!.score >= candidates[1]!.score);
		ok(candidates[1]!.score >= candidates[2]!.score);
		strictEqual(candidates[0]!.traitId, 2);
	});

	it('includes traitId and principle in output', () => {
		const signals = [makeSignal(7, 0.5, 0.2, 0.4)];
		const candidates = computePromotionCandidates(signals);
		strictEqual(candidates[0]!.traitId, 7);
		strictEqual(candidates[0]!.principle, 'Principle 7');
	});
});
