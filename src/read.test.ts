import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as read from './read.ts';

describe('read barrel', () => {
	it('exports getSoul', () => {
		strictEqual(typeof read.getSoul, 'function');
	});

	it('exports listSouls', () => {
		strictEqual(typeof read.listSouls, 'function');
	});

	it('exports getTrait', () => {
		strictEqual(typeof read.getTrait, 'function');
	});

	it('exports listShards', () => {
		strictEqual(typeof read.listShards, 'function');
	});

	it('exports formatEvidence', () => {
		strictEqual(typeof read.formatEvidence, 'function');
	});

	it('exports getLevelHistory', () => {
		strictEqual(typeof read.getLevelHistory, 'function');
	});
});
