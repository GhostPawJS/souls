import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	isSoulsError,
	SoulsError,
	SoulsNotFoundError,
	SoulsStateError,
	SoulsValidationError,
} from './errors.ts';

describe('SoulsError', () => {
	it('creates an error with the correct name and message', () => {
		const err = new SoulsError('boom');
		strictEqual(err.name, 'SoulsError');
		strictEqual(err.message, 'boom');
		ok(err instanceof Error);
	});
});

describe('SoulsNotFoundError', () => {
	it('is a subclass of SoulsError', () => {
		const err = new SoulsNotFoundError('missing');
		ok(err instanceof SoulsError);
		ok(err instanceof Error);
		strictEqual(err.name, 'SoulsNotFoundError');
	});
});

describe('SoulsValidationError', () => {
	it('is a subclass of SoulsError', () => {
		const err = new SoulsValidationError('invalid');
		ok(err instanceof SoulsError);
		strictEqual(err.name, 'SoulsValidationError');
	});
});

describe('SoulsStateError', () => {
	it('is a subclass of SoulsError', () => {
		const err = new SoulsStateError('bad state');
		ok(err instanceof SoulsError);
		strictEqual(err.name, 'SoulsStateError');
	});
});

describe('isSoulsError', () => {
	it('returns true for SoulsError instances', () => {
		strictEqual(isSoulsError(new SoulsError('x')), true);
		strictEqual(isSoulsError(new SoulsNotFoundError('x')), true);
	});

	it('returns false for plain Error instances', () => {
		strictEqual(isSoulsError(new Error('x')), false);
	});

	it('returns false for non-error values', () => {
		strictEqual(isSoulsError(null), false);
		strictEqual(isSoulsError('string'), false);
	});
});
