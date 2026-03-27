import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { inspectSoulsItemToolHandler } from './inspect_souls_item_tool.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('inspectSoulsItemToolHandler', () => {
	it('returns profile and rendered identity', () => {
		const soul = createSoul(db, { name: 'Tester', essence: 'Tests well.', description: 'D' });
		addTrait(db, soul.id, { principle: 'Be precise.', provenance: 'Tested it.' });
		const result = inspectSoulsItemToolHandler(db, { soulId: soul.id });
		ok(result.ok);
		if (result.ok) {
			const data = result.data as {
				profile: { soul: { name: string } };
				renderedIdentity: string;
			};
			strictEqual(data.profile.soul.name, 'Tester');
			ok(data.renderedIdentity.includes('Tester'));
			ok(data.renderedIdentity.includes('Be precise.'));
		}
	});

	it('includes evidence report when requested', () => {
		const soul = createSoul(db, { name: 'S', essence: 'E', description: 'D' });
		dropShard(db, { content: 'Obs 1.', source: 'session', soulIds: [soul.id] });
		const result = inspectSoulsItemToolHandler(db, {
			soulId: soul.id,
			includeEvidence: true,
		});
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { evidence?: { pendingCount: number } };
			ok(data.evidence);
			strictEqual(data.evidence.pendingCount, 1);
		}
	});

	it('excludes evidence by default', () => {
		const soul = createSoul(db, { name: 'S', essence: 'E', description: 'D' });
		const result = inspectSoulsItemToolHandler(db, { soulId: soul.id });
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { evidence?: unknown };
			strictEqual(data.evidence, undefined);
		}
	});

	it('includes provenance when requested', () => {
		const soul = createSoul(db, { name: 'S', essence: 'E', description: 'D' });
		addTrait(db, soul.id, { principle: 'Be clear.', provenance: 'Evidence from sessions.' });
		const result = inspectSoulsItemToolHandler(db, {
			soulId: soul.id,
			includeProvenance: true,
		});
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { renderedIdentity: string };
			ok(data.renderedIdentity.includes('Evidence from sessions.'));
		}
	});

	it('warns when at capacity', () => {
		const soul = createSoul(db, { name: 'S', essence: 'E', description: 'D' });
		for (let i = 0; i < 10; i++) {
			addTrait(db, soul.id, { principle: `P${i}`, provenance: `V${i}` });
		}
		const result = inspectSoulsItemToolHandler(db, { soulId: soul.id });
		ok(result.ok);
		ok(result.warnings);
		ok(result.warnings.some((w) => w.code === 'capacity_warning'));
	});

	it('fails for nonexistent soul', () => {
		const result = inspectSoulsItemToolHandler(db, { soulId: 99999 });
		ok(!result.ok);
		strictEqual(result.outcome, 'error');
	});
});
