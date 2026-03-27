import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from './create_soul.ts';
import { renderSoul } from './render_soul.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('renderSoul', () => {
	it('renders lean mode by default', () => {
		const soul = createSoul(db, {
			name: 'Aria',
			essence: 'A careful thinker who weighs evidence.',
			description: 'A specialist in analysis.',
		});

		const output = renderSoul(db, soul.id);
		ok(output.includes('# Aria'));
		ok(output.includes('*A specialist in analysis.*'));
		ok(output.includes('A careful thinker who weighs evidence.'));
		ok(!output.includes('## Traits'));
	});

	it('renders soul name as heading', () => {
		const soul = createSoul(db, { name: 'Nova', essence: 'E', description: 'D' });
		const output = renderSoul(db, soul.id);
		strictEqual(output.startsWith('# Nova'), true);
	});
});
