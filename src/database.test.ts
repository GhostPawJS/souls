import { ok } from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('SoulsDb', () => {
	it('is importable as a type', async () => {
		const mod = await import('./database.ts');
		ok(mod);
	});
});
