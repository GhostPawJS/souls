import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { dropShard } from './drop_shard.ts';
import { formatEvidence } from './format_evidence.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('formatEvidence', () => {
	it('returns a structured evidence report with all expected fields', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		addTrait(db, soul.id, { principle: 'Think carefully.', provenance: 'Evidence.' });

		for (let i = 0; i < 3; i++) {
			dropShard(db, { content: `Observation ${i}`, source: 'test', soulIds: [soul.id] });
		}

		const report = formatEvidence(db, soul.id);
		strictEqual(report.soulId, soul.id);
		strictEqual(report.pendingCount, 3);
		ok(report.renderedMarkdown.includes('# Evidence Report'));
		ok(typeof report.shardVelocity === 'number');
		ok(Array.isArray(report.promotionCandidates));
		ok(Array.isArray(report.suggestedActions));
		ok(Array.isArray(report.clusters));
	});

	it('scopes shards by tag filter', () => {
		const soul = createSoul(db, { name: 'B', essence: 'E', description: 'D' });
		dropShard(db, {
			content: 'Tagged observation about docker',
			source: 'test',
			soulIds: [soul.id],
			tags: ['docker'],
		});
		dropShard(db, {
			content: 'Untagged observation about communication',
			source: 'test',
			soulIds: [soul.id],
		});

		const report = formatEvidence(db, soul.id, { tags: ['docker'] });
		strictEqual(report.pendingCount, 1);
	});

	it('scopes shards by query filter', () => {
		const soul = createSoul(db, { name: 'C', essence: 'E', description: 'D' });
		dropShard(db, {
			content: 'delegation error in context setup',
			source: 'test',
			soulIds: [soul.id],
		});
		dropShard(db, {
			content: 'careful deliberation before acting',
			source: 'test',
			soulIds: [soul.id],
		});

		const report = formatEvidence(db, soul.id, { query: 'delegation' });
		ok(report.pendingCount >= 1);
		ok(report.clusters.every((c) => c.alignment !== undefined));
	});
});
