import { strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { awakenSoul } from './awaken_soul.ts';
import { createSoul } from './create_soul.ts';
import { retireSoul } from './retire_soul.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('awakenSoul', () => {
	it('clears deletedAt', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		retireSoul(db, soul.id);
		const awoken = awakenSoul(db, soul.id);
		strictEqual(awoken.deletedAt, null);
		strictEqual(awoken.isDormant, false);
	});

	it('allows renaming on awaken', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		retireSoul(db, soul.id);
		const awoken = awakenSoul(db, soul.id, { name: 'Phoenix' });
		strictEqual(awoken.name, 'Phoenix');
	});

	it('throws if not dormant', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		throws(() => awakenSoul(db, soul.id), SoulsStateError);
	});
});
