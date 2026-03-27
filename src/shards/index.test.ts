import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as shards from './index.ts';

describe('shards barrel', () => {
	it('exports dropShard', () => {
		strictEqual(typeof shards.dropShard, 'function');
	});

	it('exports formatEvidence', () => {
		strictEqual(typeof shards.formatEvidence, 'function');
	});

	it('exports crystallizationReadiness', () => {
		strictEqual(typeof shards.crystallizationReadiness, 'function');
	});

	it('exports listShards', () => {
		strictEqual(typeof shards.listShards, 'function');
	});

	it('exports searchShards', () => {
		strictEqual(typeof shards.searchShards, 'function');
	});
});
