import { strictEqual, throws } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from './database.ts';
import { createInitializedSoulsDb } from './lib/test-db.ts';
import { withTransaction } from './with_transaction.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('withTransaction', () => {
	it('commits on success', () => {
		withTransaction(db, () => {
			db.prepare("INSERT INTO souls_meta (key, value) VALUES ('tx_test', 'committed')").run();
		});

		const row = db.prepare("SELECT value FROM souls_meta WHERE key = 'tx_test'").get<{
			value: string;
		}>();
		strictEqual(row?.value, 'committed');
	});

	it('rolls back on error', () => {
		throws(() => {
			withTransaction(db, () => {
				db.prepare("INSERT INTO souls_meta (key, value) VALUES ('tx_fail', 'nope')").run();
				throw new Error('intentional');
			});
		}, /intentional/);

		const row = db.prepare("SELECT value FROM souls_meta WHERE key = 'tx_fail'").get<{
			value: string;
		}>();
		strictEqual(row, undefined);
	});

	it('supports nested transactions via savepoints', () => {
		withTransaction(db, () => {
			db.prepare("INSERT INTO souls_meta (key, value) VALUES ('outer', 'yes')").run();

			try {
				withTransaction(db, () => {
					db.prepare("INSERT INTO souls_meta (key, value) VALUES ('inner', 'no')").run();
					throw new Error('inner fail');
				});
			} catch {
				// inner rolled back, outer continues
			}
		});

		const outer = db.prepare("SELECT value FROM souls_meta WHERE key = 'outer'").get<{
			value: string;
		}>();
		const inner = db.prepare("SELECT value FROM souls_meta WHERE key = 'inner'").get<{
			value: string;
		}>();
		strictEqual(outer?.value, 'yes');
		strictEqual(inner, undefined);
	});
});
