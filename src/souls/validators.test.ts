import { throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SoulsValidationError } from '../errors.ts';
import {
	assertSlug,
	assertSoulDescription,
	assertSoulEssence,
	assertSoulName,
} from './validators.ts';

describe('assertSoulName', () => {
	it('throws on empty string', () => {
		throws(() => assertSoulName(''), SoulsValidationError);
		throws(() => assertSoulName('   '), SoulsValidationError);
	});
});

describe('assertSoulEssence', () => {
	it('throws on empty string', () => {
		throws(() => assertSoulEssence(''), SoulsValidationError);
	});
});

describe('assertSoulDescription', () => {
	it('throws on empty string', () => {
		throws(() => assertSoulDescription(''), SoulsValidationError);
	});
});

describe('assertSlug', () => {
	it('throws on empty string', () => {
		throws(() => assertSlug(''), SoulsValidationError);
		throws(() => assertSlug('  '), SoulsValidationError);
	});
});
