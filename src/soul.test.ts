import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderSoulsSoulPromptFoundation } from './soul.ts';

describe('renderSoulsSoulPromptFoundation', () => {
	it('returns a non-empty string', () => {
		const result = renderSoulsSoulPromptFoundation();
		strictEqual(typeof result, 'string');
		ok(result.length > 0);
	});

	it('mentions the Souls engine', () => {
		const result = renderSoulsSoulPromptFoundation();
		ok(result.includes('Souls'));
	});
});
