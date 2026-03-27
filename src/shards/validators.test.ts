import { throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SoulsValidationError } from '../errors.ts';
import { assertShardContent, assertShardSource, assertSoulIds } from './validators.ts';

describe('assertShardContent', () => {
	it('throws on empty content', () => {
		throws(() => assertShardContent(''), SoulsValidationError);
	});
});

describe('assertShardSource', () => {
	it('throws on empty source', () => {
		throws(() => assertShardSource(''), SoulsValidationError);
	});
});

describe('assertSoulIds', () => {
	it('throws on empty array', () => {
		throws(() => assertSoulIds([]), SoulsValidationError);
	});
});
