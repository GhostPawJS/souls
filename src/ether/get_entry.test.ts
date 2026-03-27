import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getEntry } from './get_entry.ts';
import { openEther } from './open_ether.ts';
import { registerSource } from './register_source.ts';

describe('getEntry', () => {
	it('returns undefined for non-existent id', () => {
		const db = openEther(':memory:');
		strictEqual(getEntry(db, 999), undefined);
		db.close();
	});

	it('returns a mapped EtherEntry', () => {
		const db = openEther(':memory:');
		registerSource(db, { id: 's', kind: 'github-csv', url: 'https://x.com', label: 'S' });
		const now = Date.now();
		db.prepare(
			`INSERT INTO ether_entries (source_id, external_id, name, description, content, category, tags, metadata, fetched_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		).run(
			's',
			'ext-1',
			'TestBot',
			'A test bot',
			'You are a test bot.',
			'agent',
			'test,bot',
			'{"foo":"bar"}',
			now,
		);

		const entry = getEntry(db, 1);
		strictEqual(entry?.name, 'TestBot');
		strictEqual(entry?.sourceId, 's');
		strictEqual(entry?.content, 'You are a test bot.');
		strictEqual(entry?.category, 'agent');
		deepStrictEqual(entry?.tags, ['test', 'bot']);
		deepStrictEqual(entry?.metadata, { foo: 'bar' });
		strictEqual(entry?.fetchedAt, now);
		db.close();
	});

	it('handles null metadata and tags', () => {
		const db = openEther(':memory:');
		registerSource(db, { id: 's', kind: 'github-csv', url: 'https://x.com', label: 'S' });
		db.prepare(
			`INSERT INTO ether_entries (source_id, external_id, name, content, fetched_at) VALUES (?, ?, ?, ?, ?)`,
		).run('s', 'ext-2', 'Bare', 'Content.', Date.now());

		const entry = getEntry(db, 1);
		deepStrictEqual(entry?.tags, []);
		strictEqual(entry?.metadata, null);
		db.close();
	});
});
