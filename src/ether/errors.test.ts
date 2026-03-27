import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SoulsError } from '../errors.ts';
import {
	EtherError,
	EtherFetchError,
	EtherNotFoundError,
	EtherParseError,
	isEtherError,
} from './errors.ts';

describe('EtherError', () => {
	it('extends SoulsError', () => {
		const err = new EtherError('test');
		ok(err instanceof SoulsError);
		strictEqual(err.name, 'EtherError');
		strictEqual(err.message, 'test');
	});
});

describe('EtherFetchError', () => {
	it('extends EtherError', () => {
		const err = new EtherFetchError('fetch failed');
		ok(err instanceof EtherError);
		ok(err instanceof SoulsError);
		strictEqual(err.name, 'EtherFetchError');
	});
});

describe('EtherParseError', () => {
	it('extends EtherError', () => {
		const err = new EtherParseError('bad csv');
		ok(err instanceof EtherError);
		strictEqual(err.name, 'EtherParseError');
	});
});

describe('EtherNotFoundError', () => {
	it('extends EtherError', () => {
		const err = new EtherNotFoundError('not found');
		ok(err instanceof EtherError);
		strictEqual(err.name, 'EtherNotFoundError');
	});
});

describe('isEtherError', () => {
	it('returns true for EtherError instances', () => {
		ok(isEtherError(new EtherError('x')));
		ok(isEtherError(new EtherFetchError('x')));
	});

	it('returns false for non-EtherError values', () => {
		ok(!isEtherError(new Error('x')));
		ok(!isEtherError(null));
		ok(!isEtherError('string'));
	});
});
