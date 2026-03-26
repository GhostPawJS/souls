import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as read from './read.ts';

describe('read barrel', () => {
	it('exports getSchemaVersion', () => {
		strictEqual(typeof read.getSchemaVersion, 'function');
	});
});
