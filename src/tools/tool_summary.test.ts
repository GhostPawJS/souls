import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeCount, summarizeSoul } from './tool_summary.ts';

describe('summarizeCount', () => {
	it('returns singular for count 1', () => {
		strictEqual(summarizeCount(1, 'soul'), '1 soul');
	});

	it('returns auto-plural for count > 1', () => {
		strictEqual(summarizeCount(5, 'soul'), '5 souls');
	});

	it('returns auto-plural for count 0', () => {
		strictEqual(summarizeCount(0, 'soul'), '0 souls');
	});

	it('uses custom plural when provided', () => {
		strictEqual(summarizeCount(3, 'entry', 'entries'), '3 entries');
	});

	it('uses custom plural even for count 0', () => {
		strictEqual(summarizeCount(0, 'entry', 'entries'), '0 entries');
	});

	it('uses singular with custom plural when count is 1', () => {
		strictEqual(summarizeCount(1, 'entry', 'entries'), '1 entry');
	});
});

describe('summarizeSoul', () => {
	it('formats name and id', () => {
		const result = summarizeSoul(1, 'Codex');
		strictEqual(result, '"Codex" (ID: 1)');
	});

	it('handles empty name', () => {
		const result = summarizeSoul(42, '');
		ok(result.includes('42'));
	});
});
