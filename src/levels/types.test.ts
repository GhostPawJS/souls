import { ok } from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ConsolidationGroup, LevelRecord, LevelUpPlan } from './types.ts';

describe('levels types', () => {
	it('LevelRecord compiles', () => {
		const rec: LevelRecord = {
			id: 1,
			soulId: 1,
			level: 2,
			essenceBefore: 'Before.',
			essenceAfter: 'After.',
			traitsConsolidated: [1, 2],
			traitsPromoted: [3],
			traitsCarried: [4],
			traitsMerged: [5],
			createdAt: 0,
		};
		ok(rec.level >= 2);
	});

	it('LevelUpPlan compiles', () => {
		const group: ConsolidationGroup = {
			sourceTraitIds: [1, 2],
			mergedPrinciple: 'Unified.',
			mergedProvenance: 'Merged from two traits.',
		};
		const plan: LevelUpPlan = {
			newEssence: 'New essence.',
			consolidations: [group],
			promotedTraitIds: [3],
			carriedTraitIds: [4],
		};
		ok(plan.newEssence.length > 0);
	});
});
