import { ok, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { EtherError } from './errors.ts';
import { manifestSoul } from './manifest_soul.ts';
import type { EtherEntry } from './types.ts';

function makeEntry(overrides?: Partial<EtherEntry>): EtherEntry {
	return {
		id: 1,
		sourceId: 'test',
		externalId: 'ext-1',
		name: 'Security Architect',
		description: 'A security-focused agent',
		content: 'You are a security architect who reviews code for vulnerabilities.',
		category: 'agent',
		tags: ['security'],
		metadata: null,
		fetchedAt: Date.now(),
		...overrides,
	};
}

describe('manifestSoul', () => {
	it('creates a soul from an ether entry', async () => {
		const soulsDb = await createInitializedSoulsDb();
		const entry = makeEntry();
		const soul = manifestSoul(soulsDb, entry);
		strictEqual(soul.name, 'Security Architect');
		strictEqual(soul.essence, entry.content);
		strictEqual(soul.description, 'A security-focused agent');
		strictEqual(soul.level, 1);
		ok(soul.id > 0);
		soulsDb.close();
	});

	it('allows overriding name and description', async () => {
		const soulsDb = await createInitializedSoulsDb();
		const entry = makeEntry();
		const soul = manifestSoul(soulsDb, entry, {
			name: 'Custom Name',
			description: 'Custom desc',
		});
		strictEqual(soul.name, 'Custom Name');
		strictEqual(soul.description, 'Custom desc');
		strictEqual(soul.essence, entry.content);
		soulsDb.close();
	});

	it('falls back to truncated content when description is empty', async () => {
		const soulsDb = await createInitializedSoulsDb();
		const longContent = 'A'.repeat(300);
		const entry = makeEntry({ description: '', content: longContent });
		const soul = manifestSoul(soulsDb, entry);
		ok(soul.description.endsWith('...'));
		ok(soul.description.length < 210);
		soulsDb.close();
	});

	it('throws on empty name', async () => {
		const soulsDb = await createInitializedSoulsDb();
		const entry = makeEntry({ name: '' });
		throws(() => manifestSoul(soulsDb, entry), EtherError);
		soulsDb.close();
	});

	it('throws on empty content', async () => {
		const soulsDb = await createInitializedSoulsDb();
		const entry = makeEntry({ content: '' });
		throws(() => manifestSoul(soulsDb, entry), EtherError);
		soulsDb.close();
	});

	it('passes slug option through to createSoul', async () => {
		const soulsDb = await createInitializedSoulsDb();
		const entry = makeEntry();
		const soul = manifestSoul(soulsDb, entry, { slug: 'sec-arch' });
		strictEqual(soul.slug, 'sec-arch');
		soulsDb.close();
	});
});
