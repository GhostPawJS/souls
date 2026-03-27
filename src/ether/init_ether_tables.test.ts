import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { openTestDatabase } from '../lib/open-test-database.ts';
import { initEtherTables } from './init_ether_tables.ts';

describe('initEtherTables', () => {
	it('creates ether_sources table', async () => {
		const db = await openTestDatabase();
		initEtherTables(db);
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
			.get<{ name: string }>('ether_sources');
		strictEqual(row?.name, 'ether_sources');
		db.close();
	});

	it('creates ether_entries table', async () => {
		const db = await openTestDatabase();
		initEtherTables(db);
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
			.get<{ name: string }>('ether_entries');
		strictEqual(row?.name, 'ether_entries');
		db.close();
	});

	it('creates ether_fts virtual table', async () => {
		const db = await openTestDatabase();
		initEtherTables(db);
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
			.get<{ name: string }>('ether_fts');
		strictEqual(row?.name, 'ether_fts');
		db.close();
	});

	it('creates source index', async () => {
		const db = await openTestDatabase();
		initEtherTables(db);
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`)
			.get<{ name: string }>('idx_ether_entries_source');
		strictEqual(row?.name, 'idx_ether_entries_source');
		db.close();
	});

	it('is idempotent', async () => {
		const db = await openTestDatabase();
		initEtherTables(db);
		initEtherTables(db);
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
			.get<{ name: string }>('ether_sources');
		strictEqual(row?.name, 'ether_sources');
		db.close();
	});
});
