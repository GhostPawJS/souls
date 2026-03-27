import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as write from './write.ts';

describe('write barrel', () => {
	it('exports createSoul', () => {
		strictEqual(typeof write.createSoul, 'function');
	});

	it('exports addTrait', () => {
		strictEqual(typeof write.addTrait, 'function');
	});

	it('exports dropShard', () => {
		strictEqual(typeof write.dropShard, 'function');
	});

	it('exports levelUp', () => {
		strictEqual(typeof write.levelUp, 'function');
	});

	it('exports revertLevelUp', () => {
		strictEqual(typeof write.revertLevelUp, 'function');
	});
});
