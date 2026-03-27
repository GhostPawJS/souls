import { strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EtherNotFoundError } from './errors.ts';
import { openEther } from './open_ether.ts';
import { registerSource } from './register_source.ts';
import { removeSource } from './remove_source.ts';

describe('removeSource', () => {
	it('removes a source and its entries', () => {
		const db = openEther(':memory:');
		registerSource(db, { id: 'test', kind: 'github-csv', url: 'https://x.com', label: 'Test' });
		const now = Date.now();
		db.prepare(
			`INSERT INTO ether_entries (source_id, external_id, name, content, fetched_at) VALUES (?, ?, ?, ?, ?)`,
		).run('test', 'e1', 'Entry 1', 'Content 1', now);
		removeSource(db, 'test');
		const sources = db.prepare(`SELECT * FROM ether_sources`).all();
		const entries = db.prepare(`SELECT * FROM ether_entries`).all();
		strictEqual(sources.length, 0);
		strictEqual(entries.length, 0);
		db.close();
	});

	it('throws EtherNotFoundError for unknown source', () => {
		const db = openEther(':memory:');
		throws(() => removeSource(db, 'nope'), EtherNotFoundError);
		db.close();
	});
});
