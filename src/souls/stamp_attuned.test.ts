import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from './create_soul.ts';
import { stampAttuned } from './stamp_attuned.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('stampAttuned', () => {
	it('sets lastAttunedAt', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		strictEqual(soul.lastAttunedAt, null);
		const stamped = stampAttuned(db, soul.id, { now: 5000 });
		ok(stamped.lastAttunedAt !== null);
		strictEqual(stamped.lastAttunedAt, 5000);
	});
});
