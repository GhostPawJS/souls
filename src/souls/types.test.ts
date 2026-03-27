import { ok } from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CreateSoulInput, SoulRecord, SoulRow, UpdateSoulInput } from './types.ts';

describe('souls types', () => {
	it('SoulRow compiles', () => {
		const row: SoulRow = {
			id: 1,
			name: 'Test',
			slug: null,
			essence: 'A tester.',
			description: 'Short.',
			level: 1,
			created_at: 0,
			updated_at: 0,
			deleted_at: null,
			last_attuned_at: null,
		};
		ok(row.id > 0);
	});

	it('SoulRecord compiles', () => {
		const rec: SoulRecord = {
			id: 1,
			name: 'Test',
			slug: null,
			essence: 'A tester.',
			description: 'Short.',
			level: 1,
			createdAt: 0,
			updatedAt: 0,
			deletedAt: null,
			lastAttunedAt: null,
			isDormant: false,
		};
		ok(!rec.isDormant);
	});

	it('CreateSoulInput compiles', () => {
		const input: CreateSoulInput = { name: 'Test', essence: 'E', description: 'D' };
		ok(input.name.length > 0);
	});

	it('UpdateSoulInput compiles with partial fields', () => {
		const input: UpdateSoulInput = { name: 'New Name' };
		ok(input.name !== undefined);
	});
});
