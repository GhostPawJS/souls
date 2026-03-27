import { strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from './create_soul.ts';
import { listDormantSouls } from './list_dormant_souls.ts';
import { retireSoul } from './retire_soul.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('listDormantSouls', () => {
	it('returns only dormant souls', () => {
		createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const soul2 = createSoul(db, { name: 'Boon', essence: 'E', description: 'D' });
		retireSoul(db, soul2.id);

		const dormant = listDormantSouls(db);
		strictEqual(dormant.length, 1);
		strictEqual(dormant[0]?.name, 'Boon');
	});
});
