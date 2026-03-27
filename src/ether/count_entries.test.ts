import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countEntries } from './count_entries.ts';
import { openEther } from './open_ether.ts';
import { registerSource } from './register_source.ts';

describe('countEntries', () => {
	it('returns 0 when empty', () => {
		const db = openEther(':memory:');
		strictEqual(countEntries(db), 0);
		db.close();
	});

	it('counts all entries', () => {
		const db = openEther(':memory:');
		registerSource(db, { id: 'a', kind: 'github-csv', url: 'https://x.com', label: 'A' });
		registerSource(db, { id: 'b', kind: 'github-csv', url: 'https://y.com', label: 'B' });
		const now = Date.now();
		db.prepare(
			`INSERT INTO ether_entries (source_id, external_id, name, content, fetched_at) VALUES (?, ?, ?, ?, ?)`,
		).run('a', '1', 'X', 'C', now);
		db.prepare(
			`INSERT INTO ether_entries (source_id, external_id, name, content, fetched_at) VALUES (?, ?, ?, ?, ?)`,
		).run('b', '1', 'Y', 'D', now);
		strictEqual(countEntries(db), 2);
		db.close();
	});

	it('counts entries filtered by sourceId', () => {
		const db = openEther(':memory:');
		registerSource(db, { id: 'a', kind: 'github-csv', url: 'https://x.com', label: 'A' });
		registerSource(db, { id: 'b', kind: 'github-csv', url: 'https://y.com', label: 'B' });
		const now = Date.now();
		db.prepare(
			`INSERT INTO ether_entries (source_id, external_id, name, content, fetched_at) VALUES (?, ?, ?, ?, ?)`,
		).run('a', '1', 'X', 'C', now);
		db.prepare(
			`INSERT INTO ether_entries (source_id, external_id, name, content, fetched_at) VALUES (?, ?, ?, ?, ?)`,
		).run('a', '2', 'Z', 'E', now);
		db.prepare(
			`INSERT INTO ether_entries (source_id, external_id, name, content, fetched_at) VALUES (?, ?, ?, ?, ?)`,
		).run('b', '1', 'Y', 'D', now);
		strictEqual(countEntries(db, 'a'), 2);
		strictEqual(countEntries(db, 'b'), 1);
		strictEqual(countEntries(db, 'unknown'), 0);
		db.close();
	});
});
