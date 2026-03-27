import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as traits from './index.ts';

describe('traits barrel', () => {
	it('exports addTrait', () => {
		strictEqual(typeof traits.addTrait, 'function');
	});

	it('exports reviseTrait', () => {
		strictEqual(typeof traits.reviseTrait, 'function');
	});

	it('exports revertTrait', () => {
		strictEqual(typeof traits.revertTrait, 'function');
	});

	it('exports reactivateTrait', () => {
		strictEqual(typeof traits.reactivateTrait, 'function');
	});

	it('exports countActiveTraits', () => {
		strictEqual(typeof traits.countActiveTraits, 'function');
	});
});
