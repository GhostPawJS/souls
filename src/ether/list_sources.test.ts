import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSource, listSources } from './list_sources.ts';
import { openEther } from './open_ether.ts';
import { registerDefaults } from './register_defaults.ts';

describe('listSources', () => {
	it('returns empty array when no sources registered', () => {
		const db = openEther(':memory:');
		strictEqual(listSources(db).length, 0);
		db.close();
	});

	it('returns all registered sources', () => {
		const db = openEther(':memory:');
		registerDefaults(db);
		const sources = listSources(db);
		strictEqual(sources.length, 2);
		strictEqual(sources[0]!.kind, 'github-csv');
		strictEqual(sources[1]!.kind, 'github-json');
		strictEqual(sources[0]!.entryCount, 0);
		strictEqual(sources[0]!.lastFetchedAt, null);
		db.close();
	});
});

describe('getSource', () => {
	it('returns undefined for unknown source', () => {
		const db = openEther(':memory:');
		strictEqual(getSource(db, 'nope'), undefined);
		db.close();
	});

	it('returns a single source by id', () => {
		const db = openEther(':memory:');
		registerDefaults(db);
		const source = getSource(db, 'awesome-chatgpt-prompts');
		strictEqual(source?.id, 'awesome-chatgpt-prompts');
		strictEqual(source?.kind, 'github-csv');
		db.close();
	});
});
