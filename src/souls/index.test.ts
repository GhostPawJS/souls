import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as souls from './index.ts';

describe('souls barrel', () => {
	it('exports createSoul', () => {
		strictEqual(typeof souls.createSoul, 'function');
	});

	it('exports getSoul', () => {
		strictEqual(typeof souls.getSoul, 'function');
	});

	it('exports renderSoul', () => {
		strictEqual(typeof souls.renderSoul, 'function');
	});

	it('exports retireSoul', () => {
		strictEqual(typeof souls.retireSoul, 'function');
	});

	it('exports awakenSoul', () => {
		strictEqual(typeof souls.awakenSoul, 'function');
	});
});
