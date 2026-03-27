import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as souls from './index.ts';

describe('public surface', () => {
	it('exports initSoulsTables', () => {
		strictEqual(typeof souls.initSoulsTables, 'function');
	});

	it('exports the read namespace', () => {
		ok(souls.read);
		strictEqual(typeof souls.read.getSoul, 'function');
		strictEqual(typeof souls.read.listSouls, 'function');
		strictEqual(typeof souls.read.formatEvidence, 'function');
	});

	it('exports the write namespace', () => {
		ok(souls.write);
		strictEqual(typeof souls.write.createSoul, 'function');
		strictEqual(typeof souls.write.addTrait, 'function');
		strictEqual(typeof souls.write.dropShard, 'function');
	});

	it('exports the errors namespace', () => {
		ok(souls.errors);
		strictEqual(typeof souls.errors.SoulsError, 'function');
	});
});
