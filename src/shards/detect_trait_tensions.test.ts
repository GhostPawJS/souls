import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectTraitTensions } from './detect_trait_tensions.ts';
import type { TraitSignal } from './types.ts';

function makeSignal(id: number, principle: string): TraitSignal {
	return {
		traitId: id,
		principle,
		tenure: 0.5,
		stale: false,
		citationCount: 0,
		citationDensity: 0,
		essenceRedundancy: 0,
		survivalCount: 0,
	};
}

describe('detectTraitTensions', () => {
	it('returns empty for empty input', () => {
		strictEqual(detectTraitTensions([]).length, 0);
	});

	it('detects negation asymmetry between two principles', () => {
		const signals = [
			makeSignal(1, 'Always use careful deliberation when planning'),
			makeSignal(2, 'Never use careful deliberation when planning'),
		];
		const tensions = detectTraitTensions(signals);
		ok(tensions.length > 0);
	});
});
