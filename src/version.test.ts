import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { soulsVersion } from './version.ts';

test('version matches package.json', () => {
	assert.equal(
		soulsVersion,
		JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version,
	);
});
