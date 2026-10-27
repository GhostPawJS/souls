import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SoulsStateError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { awakenSoul } from './awaken_soul.ts';
import { createSoul } from './create_soul.ts';
import { retireSoul } from './retire_soul.ts';
import { updateSoul } from './update_soul.ts';

const base = { essence: 'Reads every diff.', description: 'Review identity' };

test('duplicate soul names and slugs fail with a clear message instead of a SQLite error', async () => {
	const db = await createInitializedSoulsDb();
	createSoul(db, { name: 'Reviewer', slug: 'reviewer', ...base });
	const other = createSoul(db, { name: 'Planner', ...base });
	assert.throws(
		() => createSoul(db, { name: 'Reviewer', ...base }),
		(error: unknown) =>
			error instanceof SoulsStateError &&
			error.message ===
				'A soul with name "Reviewer" already exists (ID 1); choose a different name.',
	);
	assert.throws(
		() => createSoul(db, { name: 'Other', slug: 'reviewer', ...base }),
		/slug "reviewer" already exists \(ID 1\)/,
	);
	assert.throws(
		() => updateSoul(db, other.id, { name: 'Reviewer' }),
		/name "Reviewer" already exists/,
	);
	assert.equal(updateSoul(db, other.id, { name: 'Planner' }).name, 'Planner');
	retireSoul(db, other.id);
	createSoul(db, { name: 'Planner', ...base });
	assert.throws(() => awakenSoul(db, other.id), /name "Planner" already exists/);
	db.close();
});
