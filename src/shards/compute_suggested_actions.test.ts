import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeSuggestedActions } from './compute_suggested_actions.ts';
import type { EvidenceCluster, TraitSignal } from './types.ts';

function makeSignal(overrides: Partial<TraitSignal> = {}): TraitSignal {
	return {
		traitId: 1,
		principle: 'Some principle',
		tenure: 0.5,
		citationCount: 2,
		citationDensity: 0.02,
		essenceRedundancy: 0,
		stale: false,
		survivalCount: 1,
		...overrides,
	};
}

function makeCluster(alignment: EvidenceCluster['alignment']): EvidenceCluster {
	return {
		members: [
			{
				id: 1,
				content: 'c',
				source: 's',
				status: 'pending',
				sealed: false,
				soulIds: [],
				traitIds: [],
				tags: [],
				createdAt: 1,
				updatedAt: 1,
			},
		],
		weight: 1,
		sourceDiversity: 1,
		avgFreshness: 1,
		alignment,
		sharedWith: [],
	};
}

describe('computeSuggestedActions', () => {
	it('returns empty when no signals triggered', () => {
		const actions = computeSuggestedActions({
			traitSignals: [],
			clusters: [],
			consolidationSuggestions: [],
			promotionCandidates: [],
		});
		strictEqual(actions.length, 0);
	});

	it('flags stale traits', () => {
		const actions = computeSuggestedActions({
			traitSignals: [makeSignal({ stale: true }), makeSignal({ stale: true })],
			clusters: [],
			consolidationSuggestions: [],
			promotionCandidates: [],
		});
		ok(actions.some((a) => a.includes('2 traits flagged stale')));
	});

	it('flags redundant traits', () => {
		const actions = computeSuggestedActions({
			traitSignals: [makeSignal({ essenceRedundancy: 0.5 })],
			clusters: [],
			consolidationSuggestions: [],
			promotionCandidates: [],
			redundancyThreshold: 0.3,
		});
		ok(actions.some((a) => a.includes('redundant with essence')));
	});

	it('flags novel clusters', () => {
		const actions = computeSuggestedActions({
			traitSignals: [],
			clusters: [makeCluster({ kind: 'novel' })],
			consolidationSuggestions: [],
			promotionCandidates: [],
		});
		ok(actions.some((a) => a.includes('not aligned with any trait')));
	});

	it('flags at-capacity soul', () => {
		const signals = Array.from({ length: 10 }, (_, i) => makeSignal({ traitId: i + 1 }));
		const actions = computeSuggestedActions({
			traitSignals: signals,
			clusters: [],
			consolidationSuggestions: [],
			promotionCandidates: [],
			traitLimit: 10,
		});
		ok(actions.some((a) => a.includes('level-up recommended')));
	});

	it('flags consolidation candidates', () => {
		const actions = computeSuggestedActions({
			traitSignals: [],
			clusters: [],
			consolidationSuggestions: [{ traitIds: [1, 2], principles: ['A', 'B'], similarity: 0.5 }],
			promotionCandidates: [],
		});
		ok(actions.some((a) => a.includes('consolidation candidates')));
	});
});
