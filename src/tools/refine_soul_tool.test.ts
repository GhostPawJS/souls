import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { addTrait } from '../traits/add_trait.ts';
import { refineSoulToolHandler } from './refine_soul_tool.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('refineSoulToolHandler', () => {
	it('adds a trait', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const result = refineSoulToolHandler(db, {
			action: 'add_trait',
			soulId: soul.id,
			principle: 'Think carefully.',
			provenance: 'Evidence.',
		});
		ok(result.ok);
		if (result.ok) {
			const data = result.data as { trait: { principle: string } };
			strictEqual(data.trait.principle, 'Think carefully.');
		}
	});

	it('reverts a trait', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, { principle: 'P', provenance: 'E.' });
		const result = refineSoulToolHandler(db, { action: 'revert_trait', traitId: trait.id });
		ok(result.ok);
	});

	it('returns error for unknown trait', () => {
		const result = refineSoulToolHandler(db, { action: 'revert_trait', traitId: 99999 });
		ok(!result.ok);
		strictEqual(result.outcome, 'error');
	});

	it('stamps attunement', () => {
		const soul = createSoul(db, { name: 'A', essence: 'E', description: 'D' });
		const result = refineSoulToolHandler(db, { action: 'stamp_attuned', soulId: soul.id });
		ok(result.ok);
	});
});
