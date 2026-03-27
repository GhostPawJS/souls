import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { openEther } from './open_ether.ts';
import { registerSource } from './register_source.ts';
import { searchEther } from './search_ether.ts';

function seedEntries(db: ReturnType<typeof openEther>) {
	registerSource(db, { id: 'src', kind: 'github-csv', url: 'https://x.com', label: 'X' });
	const now = Date.now();
	const stmt = db.prepare(
		`INSERT INTO ether_entries (source_id, external_id, name, description, content, category, tags, fetched_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
	);
	stmt.run(
		'src',
		'e1',
		'Security Architect',
		'A security-focused agent',
		'You are a security architect reviewing code.',
		'agent',
		'security,code',
		now,
	);
	stmt.run(
		'src',
		'e2',
		'Travel Guide',
		'Helps plan trips',
		'You are a travel guide suggesting destinations.',
		'TEXT',
		'travel',
		now,
	);
	stmt.run(
		'src',
		'e3',
		'Linux Terminal',
		'Acts as a terminal',
		'I want you to act as a linux terminal.',
		'TEXT',
		null,
		now,
	);
	db.exec("INSERT INTO ether_fts(ether_fts) VALUES('rebuild')");
}

describe('searchEther', () => {
	it('returns matching entries via FTS', () => {
		const db = openEther(':memory:');
		seedEntries(db);
		const results = searchEther(db, 'security');
		strictEqual(results.length, 1);
		strictEqual(results[0]!.name, 'Security Architect');
		ok(results[0]!.tags.includes('security'));
		db.close();
	});

	it('returns empty for no matches', () => {
		const db = openEther(':memory:');
		seedEntries(db);
		const results = searchEther(db, 'quantum physics');
		strictEqual(results.length, 0);
		db.close();
	});

	it('returns empty for query shorter than 2 chars', () => {
		const db = openEther(':memory:');
		seedEntries(db);
		strictEqual(searchEther(db, 'a').length, 0);
		strictEqual(searchEther(db, '').length, 0);
		db.close();
	});

	it('filters by sourceId', () => {
		const db = openEther(':memory:');
		seedEntries(db);
		registerSource(db, { id: 'other', kind: 'github-csv', url: 'https://y.com', label: 'Y' });
		const results = searchEther(db, 'linux', { sourceId: 'other' });
		strictEqual(results.length, 0);
		db.close();
	});

	it('filters by category', () => {
		const db = openEther(':memory:');
		seedEntries(db);
		const results = searchEther(db, 'architect', { category: 'TEXT' });
		strictEqual(results.length, 0);
		const results2 = searchEther(db, 'architect', { category: 'agent' });
		strictEqual(results2.length, 1);
		db.close();
	});

	it('respects limit option', () => {
		const db = openEther(':memory:');
		seedEntries(db);
		const results = searchEther(db, 'you', { limit: 1 });
		strictEqual(results.length, 1);
		db.close();
	});

	it('matches across name and content', () => {
		const db = openEther(':memory:');
		seedEntries(db);
		const results = searchEther(db, 'terminal');
		strictEqual(results.length, 1);
		strictEqual(results[0]!.name, 'Linux Terminal');
		db.close();
	});
});
