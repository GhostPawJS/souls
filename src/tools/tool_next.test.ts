import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	inspectSoulsItemToolName,
	observeSoulToolName,
	refineSoulToolName,
	reviewSoulsToolName,
	searchSoulsToolName,
} from './tool_names.ts';
import {
	inspectSoulsItemNext,
	observeSoulNext,
	refineSoulNext,
	retryNext,
	reviewSoulsNext,
	searchSoulsNext,
	useToolNext,
} from './tool_next.ts';

describe('searchSoulsNext', () => {
	it('returns use_tool hint with query', () => {
		const hint = searchSoulsNext('error handling');
		strictEqual(hint.kind, 'use_tool');
		strictEqual(hint.tool, searchSoulsToolName);
		ok(hint.message.includes('error handling'));
		deepStrictEqual(hint.suggestedInput, { query: 'error handling' });
	});

	it('returns use_tool hint with soulId', () => {
		const hint = searchSoulsNext(undefined, 5);
		strictEqual(hint.tool, searchSoulsToolName);
		deepStrictEqual(hint.suggestedInput, { soulId: 5 });
	});

	it('returns hint without suggestedInput when no args given', () => {
		const hint = searchSoulsNext();
		strictEqual(hint.suggestedInput, undefined);
		ok(hint.message.includes('pending'));
	});

	it('includes both query and soulId when provided', () => {
		const hint = searchSoulsNext('delegation', 3);
		deepStrictEqual(hint.suggestedInput, { query: 'delegation', soulId: 3 });
	});
});

describe('inspectSoulsItemNext', () => {
	it('includes soul name in message', () => {
		const hint = inspectSoulsItemNext(1, 'Codex');
		strictEqual(hint.kind, 'inspect_item');
		strictEqual(hint.tool, inspectSoulsItemToolName);
		ok(hint.message.includes('Codex'));
		deepStrictEqual(hint.suggestedInput, { soulId: 1 });
	});

	it('uses soul ID in message when no name', () => {
		const hint = inspectSoulsItemNext(42);
		ok(hint.message.includes('42'));
	});
});

describe('reviewSoulsNext', () => {
	it('returns review_view hint', () => {
		const hint = reviewSoulsNext('Check all souls.');
		strictEqual(hint.kind, 'review_view');
		strictEqual(hint.tool, reviewSoulsToolName);
		strictEqual(hint.message, 'Check all souls.');
	});
});

describe('observeSoulNext', () => {
	it('returns use_tool hint with soulId', () => {
		const hint = observeSoulNext(7, 'Observe behavior.');
		strictEqual(hint.kind, 'use_tool');
		strictEqual(hint.tool, observeSoulToolName);
		deepStrictEqual(hint.suggestedInput, { soulId: 7 });
	});
});

describe('refineSoulNext', () => {
	it('returns use_tool hint with action and soulId', () => {
		const hint = refineSoulNext('add_trait', 3, 'Add a new trait.');
		strictEqual(hint.tool, refineSoulToolName);
		deepStrictEqual(hint.suggestedInput, { action: 'add_trait', soulId: 3 });
	});
});

describe('retryNext', () => {
	it('returns retry_with hint', () => {
		const hint = retryNext('Try again with corrected ID');
		strictEqual(hint.kind, 'retry_with');
		strictEqual(hint.suggestedInput, undefined);
	});

	it('includes suggestedInput when given', () => {
		const hint = retryNext('Retry', { soulId: 10 });
		deepStrictEqual(hint.suggestedInput, { soulId: 10 });
	});
});

describe('useToolNext', () => {
	it('returns use_tool hint for arbitrary tool', () => {
		const hint = useToolNext('some_tool', 'Do something');
		strictEqual(hint.kind, 'use_tool');
		strictEqual(hint.tool, 'some_tool');
		strictEqual(hint.suggestedInput, undefined);
	});

	it('includes suggestedInput when given', () => {
		const hint = useToolNext('x', 'msg', { key: 'val' });
		deepStrictEqual(hint.suggestedInput, { key: 'val' });
	});
});
