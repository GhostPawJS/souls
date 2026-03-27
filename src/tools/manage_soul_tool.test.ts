import { ok, strictEqual } from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { manageSoulToolHandler } from './manage_soul_tool.ts';

let db: SoulsDb;

beforeEach(async () => {
	db = await createInitializedSoulsDb();
});

describe('manageSoulToolHandler', () => {
	it('creates a soul', () => {
		const result = manageSoulToolHandler(db, {
			action: 'create',
			name: 'Aria',
			essence: 'E',
			description: 'D',
		});
		ok(result.ok);
		if (result.ok) {
			strictEqual(result.data.soul.name, 'Aria');
		}
	});

	it('returns clarification when name is missing for create', () => {
		const result = manageSoulToolHandler(db, {
			action: 'create',
			essence: 'E',
			description: 'D',
		});
		ok(!result.ok);
		strictEqual(result.outcome, 'needs_clarification');
	});

	it('updates a soul', () => {
		const soul = createSoul(db, { name: 'Aria', essence: 'E', description: 'D' });
		const result = manageSoulToolHandler(db, {
			action: 'update',
			soulId: soul.id,
			name: 'Aria Updated',
		});
		ok(result.ok);
		if (result.ok) {
			strictEqual(result.data.soul.name, 'Aria Updated');
		}
	});

	it('returns error for unknown soul id on retire', () => {
		const result = manageSoulToolHandler(db, { action: 'retire', soulId: 99999 });
		ok(!result.ok);
		strictEqual(result.outcome, 'error');
	});
});
