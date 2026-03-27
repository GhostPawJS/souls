import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from './create_soul.ts';
import { listSouls } from './list_souls.ts';
import { retireSoul } from './retire_soul.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('listSouls', () => {
	it('returns only active souls', () => {
		createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const soul2 = createSoul(db, { name: 'Boon', essence: 'E', description: 'D' });
		retireSoul(db, soul2.id);

		const souls = listSouls(db);
		strictEqual(souls.length, 1);
		strictEqual(souls[0]?.name, 'Aria');
	});
});
