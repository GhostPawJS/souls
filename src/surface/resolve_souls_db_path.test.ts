import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { resolveSoulsDbPath } from './resolve_souls_db_path.ts';

test('database path precedence is flag, environment, home default', () => {
	assert.equal(
		resolveSoulsDbPath({ flag: ':memory:', env: { GHOSTPAW_SOULS_DB: 'env' } }),
		':memory:',
	);
	assert.equal(resolveSoulsDbPath({ env: { GHOSTPAW_SOULS_DB: 'env' } }), 'env');
	assert.equal(resolveSoulsDbPath({ env: {} }), join(homedir(), '.ghostpaw', 'souls.db'));
});

test('empty environment path uses the default', () => {
	assert.equal(
		resolveSoulsDbPath({ env: { GHOSTPAW_SOULS_DB: '' } }),
		resolveSoulsDbPath({ env: {} }),
	);
});
