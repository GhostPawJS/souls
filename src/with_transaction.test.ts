import { strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from './database.ts';
import { createInitializedSoulsDb } from './lib/test-db.ts';
import { createSoul } from './souls/create_soul.ts';
import { withTransaction } from './with_transaction.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('withTransaction', () => {
	it('commits on success', () => {
		withTransaction(db, () => {
			createSoul(db, { name: 'TxTest', essence: 'E', description: 'D' });
		});

		const row = db.prepare("SELECT name FROM souls WHERE name = 'TxTest'").get<{ name: string }>();
		strictEqual(row?.name, 'TxTest');
	});

	it('rolls back on error', () => {
		throws(() => {
			withTransaction(db, () => {
				createSoul(db, { name: 'TxFail', essence: 'E', description: 'D' });
				throw new Error('intentional');
			});
		}, /intentional/);

		const row = db.prepare("SELECT name FROM souls WHERE name = 'TxFail'").get<{ name: string }>();
		strictEqual(row, undefined);
	});

	it('supports nested transactions via savepoints', () => {
		withTransaction(db, () => {
			createSoul(db, { name: 'Outer', essence: 'E', description: 'D' });

			try {
				withTransaction(db, () => {
					createSoul(db, { name: 'Inner', essence: 'E', description: 'D' });
					throw new Error('inner fail');
				});
			} catch {
				// inner rolled back, outer continues
			}
		});

		const outer = db.prepare("SELECT name FROM souls WHERE name = 'Outer'").get<{ name: string }>();
		const inner = db.prepare("SELECT name FROM souls WHERE name = 'Inner'").get<{ name: string }>();
		strictEqual(outer?.name, 'Outer');
		strictEqual(inner, undefined);
	});
});
