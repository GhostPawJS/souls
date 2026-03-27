import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { suggestConsolidations } from './suggest_consolidations.ts';
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

describe('suggestConsolidations', () => {
	it('returns empty for empty input', () => {
		strictEqual(suggestConsolidations([]).length, 0);
	});

	it('suggests consolidation for similar principles', () => {
		const signals = [
			makeSignal(1, 'Think carefully before acting on any decision'),
			makeSignal(2, 'Think carefully before making any decision'),
		];
		const suggestions = suggestConsolidations(signals, { threshold: 0.3 });
		ok(suggestions.length > 0);
		strictEqual(suggestions[0]?.traitIds.length, 2);
	});
});
