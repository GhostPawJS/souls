import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeShardContent } from './normalize_shard_content.ts';

describe('normalizeShardContent', () => {
	it('trims whitespace', () => {
		strictEqual(normalizeShardContent('  hello  '), 'hello');
	});

	it('collapses internal whitespace', () => {
		strictEqual(normalizeShardContent('hello   world'), 'hello world');
	});
});
