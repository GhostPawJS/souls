import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as write from './write.ts';

describe('write barrel', () => {
	it('exports setMeta', () => {
		strictEqual(typeof write.setMeta, 'function');
	});
});
