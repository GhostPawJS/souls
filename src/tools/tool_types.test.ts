import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toolFailure, toolNoOp, toolSuccess, toolWarning } from './tool_types.ts';

describe('tool_types', () => {
	it('toolSuccess returns ok result with data', () => {
		const result = toolSuccess('Done', { id: 1 });
		ok(result.ok);
		strictEqual(result.outcome, 'success');
		strictEqual(result.data.id, 1);
	});

	it('toolNoOp returns ok no_op result', () => {
		const result = toolNoOp('Nothing to do', {});
		ok(result.ok);
		strictEqual(result.outcome, 'no_op');
	});

	it('toolFailure returns error result', () => {
		const result = toolFailure('domain', 'not_found', 'Soul not found', 'id 99 not found');
		ok(!result.ok);
		strictEqual(result.outcome, 'error');
		strictEqual(result.error.code, 'not_found');
	});

	it('toolWarning returns correct shape', () => {
		const w = toolWarning('capacity_warning', 'At limit');
		strictEqual(w.code, 'capacity_warning');
		ok(w.message.length > 0);
	});

	it('toolSuccess includes next hints when provided', () => {
		const result = toolSuccess(
			'Done',
			{},
			{
				next: [{ kind: 'use_tool', message: 'Check this', tool: 'inspect_soul' }],
			},
		);
		ok(result.next && result.next.length === 1);
	});
});
