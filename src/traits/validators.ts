import { SoulsValidationError } from '../errors.ts';
import { TRAIT_STATUSES, type TraitStatus } from './types.ts';

export function assertPrinciple(principle: string): void {
	if (principle.trim().length === 0) {
		throw new SoulsValidationError('Trait principle must not be empty.');
	}
}

export function assertProvenance(provenance: string): void {
	if (provenance.trim().length === 0) {
		throw new SoulsValidationError('Trait provenance must not be empty. No provenance, no trait.');
	}
}

export function assertTraitStatus(status: string): asserts status is TraitStatus {
	if (!TRAIT_STATUSES.includes(status as TraitStatus)) {
		throw new SoulsValidationError(`Unsupported trait status: ${status}.`);
	}
}
