import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapSoulRow } from './map_soul_row.ts';
import type { SoulRow } from './types.ts';

const baseRow: SoulRow = {
	id: 1,
	name: 'Tester',
	slug: null,
	essence: 'An essence.',
	description: 'A description.',
	level: 1,
	created_at: 100,
	updated_at: 200,
	deleted_at: null,
	last_attuned_at: null,
};

describe('mapSoulRow', () => {
	it('maps fields correctly', () => {
		const rec = mapSoulRow(baseRow);
		strictEqual(rec.id, 1);
		strictEqual(rec.name, 'Tester');
		strictEqual(rec.essence, 'An essence.');
		strictEqual(rec.level, 1);
		strictEqual(rec.createdAt, 100);
		strictEqual(rec.updatedAt, 200);
		strictEqual(rec.deletedAt, null);
		strictEqual(rec.lastAttunedAt, null);
	});

	it('sets isDormant false when deleted_at is null', () => {
		const rec = mapSoulRow(baseRow);
		strictEqual(rec.isDormant, false);
	});

	it('sets isDormant true when deleted_at is set', () => {
		const rec = mapSoulRow({ ...baseRow, deleted_at: 999 });
		strictEqual(rec.isDormant, true);
	});
});
