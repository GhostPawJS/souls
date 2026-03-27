import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	SoulsError,
	SoulsNotFoundError,
	SoulsStateError,
	SoulsValidationError,
} from '../errors.ts';
import { soulEntityHint, soulNotFoundHints, translateToolError } from './tool_errors.ts';
import { inspectSoulsItemToolName } from './tool_names.ts';

describe('translateToolError', () => {
	it('maps SoulsNotFoundError to domain/not_found with recovery', () => {
		const result = translateToolError(new SoulsNotFoundError('Soul 99 not found'));
		ok(!result.ok);
		strictEqual(result.error.kind, 'domain');
		strictEqual(result.error.code, 'not_found');
		ok(result.error.recovery);
		ok(result.next && result.next.length >= 2);
	});

	it('maps SoulsValidationError to protocol/invalid_input', () => {
		const result = translateToolError(new SoulsValidationError('bad input'));
		strictEqual(result.error.kind, 'protocol');
		strictEqual(result.error.code, 'invalid_input');
	});

	it('maps SoulsStateError to domain/invalid_state', () => {
		const result = translateToolError(new SoulsStateError('cannot retire'));
		strictEqual(result.error.kind, 'domain');
		strictEqual(result.error.code, 'invalid_state');
	});

	it('maps generic SoulsError to system/system_error', () => {
		const result = translateToolError(new SoulsError('something broke'));
		strictEqual(result.error.kind, 'system');
		strictEqual(result.error.code, 'system_error');
	});

	it('maps plain Error to system/system_error', () => {
		const result = translateToolError(new Error('oops'));
		strictEqual(result.error.code, 'system_error');
		strictEqual(result.error.message, 'oops');
	});

	it('maps non-Error value to system/system_error', () => {
		const result = translateToolError('raw string error');
		strictEqual(result.error.code, 'system_error');
		strictEqual(result.error.message, 'raw string error');
	});

	it('uses custom summary when provided', () => {
		const result = translateToolError(new SoulsNotFoundError('missing'), {
			summary: 'Custom summary',
		});
		strictEqual(result.summary, 'Custom summary');
	});

	it('preserves caller-supplied next hints alongside not-found hints', () => {
		const callerHint = { kind: 'retry_with' as const, message: 'Try again' };
		const result = translateToolError(new SoulsNotFoundError('missing'), {
			next: [callerHint],
		});
		ok(result.next && result.next.length >= 3);
		strictEqual(result.next![0]!.kind, 'retry_with');
	});

	it('uses default summary from error message for non-SoulsError', () => {
		const result = translateToolError(new Error('kaboom'));
		strictEqual(result.summary, 'An unexpected error occurred.');
	});

	it('uses custom summary for non-SoulsError when provided', () => {
		const result = translateToolError(42, { summary: 'Numeric bad' });
		strictEqual(result.summary, 'Numeric bad');
	});
});

describe('soulNotFoundHints', () => {
	it('returns array with review_souls hint', () => {
		const hints = soulNotFoundHints(99);
		ok(hints.length >= 1);
		ok(hints[0]!.message.includes('99'));
	});
});

describe('soulEntityHint', () => {
	it('returns inspect hint for soul with name', () => {
		const hint = soulEntityHint(1, 'Codex');
		strictEqual(hint.kind, 'inspect_item');
		strictEqual(hint.tool, inspectSoulsItemToolName);
		ok(hint.message.includes('Codex'));
		deepStrictEqual(hint.suggestedInput, { soulId: 1 });
	});

	it('returns inspect hint for soul without name', () => {
		const hint = soulEntityHint(42);
		ok(hint.message.includes('42'));
	});
});
