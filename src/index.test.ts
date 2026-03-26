import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as souls from './index.ts';

describe('public surface', () => {
	it('exports initSoulsTables', () => {
		strictEqual(typeof souls.initSoulsTables, 'function');
	});

	it('exports the read namespace', () => {
		ok(souls.read);
		strictEqual(typeof souls.read.getSchemaVersion, 'function');
	});

	it('exports the write namespace', () => {
		ok(souls.write);
		strictEqual(typeof souls.write.setMeta, 'function');
	});

	it('exports the soul namespace', () => {
		ok(souls.soul);
		strictEqual(typeof souls.soul.renderSoulsSoulPromptFoundation, 'function');
	});

	it('exports the errors namespace', () => {
		ok(souls.errors);
		strictEqual(typeof souls.errors.SoulsError, 'function');
	});
});
