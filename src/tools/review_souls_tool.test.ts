import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { reviewSoulsToolHandler } from './review_souls_tool.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('reviewSoulsToolHandler', () => {
	it('list returns active souls', () => {
		createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const result = reviewSoulsToolHandler(db, { view: 'list' });
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { souls: unknown[] };
			ok(data.souls.length >= 1);
		}
	});

	it('maintenance returns fadedShardCount and readySouls', () => {
		const result = reviewSoulsToolHandler(db, { view: 'maintenance' });
		ok(result.ok);
		if (result.ok) {
			const data = result.data as {
				maintenance: { fadedShardCount: number; readySouls: unknown[] };
			};
			strictEqual(typeof data.maintenance.fadedShardCount, 'number');
			ok(Array.isArray(data.maintenance.readySouls));
		}
	});

	it('readiness returns ready souls array', () => {
		const result = reviewSoulsToolHandler(db, { view: 'readiness' });
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { readySouls: unknown[] };
			ok(Array.isArray(data.readySouls));
		}
	});
});
