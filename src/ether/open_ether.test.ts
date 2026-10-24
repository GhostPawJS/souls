import { ok, strictEqual } from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { openEther } from './open_ether.ts';

describe('openEther', () => {
	it('sets a five-second busy timeout for memory and temporary databases', () => {
		for (const path of [':memory:', '']) {
			const db = openEther(path);
			try {
				strictEqual(db.prepare('PRAGMA busy_timeout').get<{ timeout: number }>()?.timeout, 5000);
				strictEqual(
					db.prepare('PRAGMA journal_mode').get<{ journal_mode: string }>()?.journal_mode,
					path === ':memory:' ? 'memory' : 'delete',
				);
			} finally {
				db.close();
			}
		}
	});

	it('enables WAL and a busy timeout for file databases, including reopening', () => {
		const directory = mkdtempSync(join(process.cwd(), '.ether-test-'));
		try {
			for (let i = 0; i < 2; i++) {
				const db = openEther(join(directory, 'ether.db'));
				try {
					strictEqual(
						db.prepare('PRAGMA journal_mode').get<{ journal_mode: string }>()?.journal_mode,
						'wal',
					);
					strictEqual(db.prepare('PRAGMA busy_timeout').get<{ timeout: number }>()?.timeout, 5000);
				} finally {
					db.close();
				}
			}
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});

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
