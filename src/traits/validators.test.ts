import { throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SoulsValidationError } from '../errors.ts';
import { assertPrinciple, assertProvenance } from './validators.ts';

describe('assertPrinciple', () => {
	it('throws on empty principle', () => {
		throws(() => assertPrinciple(''), SoulsValidationError);
	});
});

describe('assertProvenance', () => {
	it('throws on empty provenance', () => {
		throws(() => assertProvenance(''), SoulsValidationError);
	});
});
