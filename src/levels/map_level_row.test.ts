import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapLevelRow } from './map_level_row.ts';
import type { LevelRow } from './types.ts';

describe('mapLevelRow', () => {
	it('parses JSON arrays correctly', () => {
		const row: LevelRow = {
			id: 1,
			soul_id: 1,
			level: 2,
			essence_before: 'Before.',
			essence_after: 'After.',
			traits_consolidated: '[1,2]',
			traits_promoted: '[3]',
			traits_carried: '[4]',
			traits_merged: '[5]',
			created_at: 0,
		};
		const rec = mapLevelRow(row);
		strictEqual(rec.traitsConsolidated.length, 2);
		strictEqual(rec.traitsPromoted[0], 3);
		strictEqual(rec.traitsMerged[0], 5);
	});
});
