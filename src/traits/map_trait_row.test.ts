import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapTraitRow } from './map_trait_row.ts';
import type { TraitRow } from './types.ts';

describe('mapTraitRow', () => {
	it('maps all fields correctly', () => {
		const row: TraitRow = {
			id: 1,
			soul_id: 2,
			principle: 'Think carefully.',
			provenance: 'Observed in session.',
			generation: 1,
			status: 'active',
			merged_into: null,
			created_at: 100,
			updated_at: 200,
		};
		const rec = mapTraitRow(row);
		strictEqual(rec.id, 1);
		strictEqual(rec.soulId, 2);
		strictEqual(rec.principle, 'Think carefully.');
		strictEqual(rec.provenance, 'Observed in session.');
		strictEqual(rec.status, 'active');
		strictEqual(rec.mergedInto, null);
	});
});
