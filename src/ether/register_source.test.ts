import { strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EtherError } from './errors.ts';
import { openEther } from './open_ether.ts';
import { registerSource } from './register_source.ts';

describe('registerSource', () => {
	it('inserts a source into ether_sources', () => {
		const db = openEther(':memory:');
		registerSource(db, {
			id: 'test',
			kind: 'github-csv',
			url: 'https://x.com/a.csv',
			label: 'Test',
		});
		const row = db.prepare(`SELECT id FROM ether_sources WHERE id = ?`).get<{ id: string }>('test');
		strictEqual(row?.id, 'test');
		db.close();
	});

	it('ignores duplicate registration', () => {
		const db = openEther(':memory:');
		registerSource(db, {
			id: 'test',
			kind: 'github-csv',
			url: 'https://x.com/a.csv',
			label: 'Test',
		});
		registerSource(db, {
			id: 'test',
			kind: 'github-csv',
			url: 'https://x.com/b.csv',
			label: 'Test2',
		});
		const rows = db.prepare(`SELECT * FROM ether_sources`).all();
		strictEqual(rows.length, 1);
		db.close();
	});

	it('throws on empty id', () => {
		const db = openEther(':memory:');
		throws(
			() => registerSource(db, { id: '', kind: 'github-csv', url: 'https://x.com', label: 'X' }),
			EtherError,
		);
		db.close();
	});

	it('throws on empty url', () => {
		const db = openEther(':memory:');
		throws(
			() => registerSource(db, { id: 'x', kind: 'github-csv', url: '', label: 'X' }),
			EtherError,
		);
		db.close();
	});
});
