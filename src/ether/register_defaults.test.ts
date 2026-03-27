import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { openEther } from './open_ether.ts';
import { registerDefaults } from './register_defaults.ts';

describe('registerDefaults', () => {
	it('registers both known sources', () => {
		const db = openEther(':memory:');
		registerDefaults(db);
		const rows = db.prepare(`SELECT id FROM ether_sources ORDER BY id`).all<{ id: string }>();
		strictEqual(rows.length, 2);
		strictEqual(rows[0]!.id, 'awesome-chatgpt-prompts');
		strictEqual(rows[1]!.id, 'rosehill-system-prompts');
		db.close();
	});

	it('is idempotent', () => {
		const db = openEther(':memory:');
		registerDefaults(db);
		registerDefaults(db);
		const rows = db.prepare(`SELECT id FROM ether_sources`).all();
		strictEqual(rows.length, 2);
		db.close();
	});
});
