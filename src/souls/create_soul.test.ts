import { ok, strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from './create_soul.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('createSoul', () => {
	it('creates a soul with required fields', () => {
		const soul = createSoul(db, {
			name: 'Aria',
			essence: 'A careful thinker.',
			description: 'Short.',
		});
		ok(soul.id > 0);
		strictEqual(soul.name, 'Aria');
		strictEqual(soul.essence, 'A careful thinker.');
		strictEqual(soul.level, 1);
		strictEqual(soul.isDormant, false);
	});

	it('creates a soul with slug', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D', slug: 'aria' });
		strictEqual(soul.slug, 'aria');
	});

	it('throws on empty name', () => {
		throws(
			() => createSoul(db, { name: '', essence: 'E', description: 'D' }),
			SoulsValidationError,
		);
	});

	it('throws on empty essence', () => {
		throws(
			() => createSoul(db, { name: 'Aria', essence: '', description: 'D' }),
			SoulsValidationError,
		);
	});
});
