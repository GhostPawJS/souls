import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from './create_soul.ts';
import { getSoulByName } from './get_soul_by_name.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('getSoulByName', () => {
	it('returns the soul by name', () => {
		createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const found = getSoulByName(db, 'Aria');
		ok(found);
		strictEqual(found.name, 'Aria');
	});

	it('returns undefined for unknown name', () => {
		const found = getSoulByName(db, 'Ghost');
		strictEqual(found, undefined);
	});
});
