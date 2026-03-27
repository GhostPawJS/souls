import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from './create_soul.ts';
import { updateSoul } from './update_soul.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('updateSoul', () => {
	it('updates name', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const updated = updateSoul(db, soul.id, { name: 'Nova' });
		strictEqual(updated.name, 'Nova');
	});

	it('updates essence', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'Old.', description: 'D' });
		const updated = updateSoul(db, soul.id, { essence: 'New essence text.' });
		strictEqual(updated.essence, 'New essence text.');
	});

	it('updates slug to null', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D', slug: 'aria' });
		const updated = updateSoul(db, soul.id, { slug: null });
		strictEqual(updated.slug, null);
	});
});
