import { SoulsValidationError } from '../errors.ts';

export function assertSoulName(name: string): void {
	if (name.trim().length === 0) {
		throw new SoulsValidationError('Soul name must not be empty.');
	}
}

export function assertSoulEssence(essence: string): void {
	if (essence.trim().length === 0) {
		throw new SoulsValidationError('Soul essence must not be empty.');
	}
}

export function assertSoulDescription(description: string): void {
	if (description.trim().length === 0) {
		throw new SoulsValidationError('Soul description must not be empty.');
	}
}

export function assertSlug(slug: string): void {
	if (slug.trim().length === 0) {
		throw new SoulsValidationError('Soul slug must not be empty when provided.');
	}
}
