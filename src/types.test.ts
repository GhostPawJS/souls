import { ok } from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('types', () => {
	it('re-exports are importable', async () => {
		const mod = await import('./types.ts');
		ok(mod);
	});
});
