import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { openEther } from './open_ether.ts';

describe('openEther', () => {
	it('returns a SoulsDb with exec and prepare', () => {
		const db = openEther(':memory:');
		ok(typeof db.exec === 'function');
		ok(typeof db.prepare === 'function');
		ok(typeof db.close === 'function');
		db.close();
	});

	it('initializes ether tables on open', () => {
		const db = openEther(':memory:');
		const row = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
			.get<{ name: string }>('ether_sources');
		strictEqual(row?.name, 'ether_sources');
		db.close();
	});

	it('can insert and query ether_sources', () => {
		const db = openEther(':memory:');
		db.prepare(`INSERT INTO ether_sources (id, kind, url, label) VALUES (?, ?, ?, ?)`).run(
			'test',
			'github-csv',
			'https://example.com',
			'Test Source',
		);
		const row = db.prepare(`SELECT id FROM ether_sources WHERE id = ?`).get<{ id: string }>('test');
		strictEqual(row?.id, 'test');
		db.close();
	});
});
