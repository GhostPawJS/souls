import { SoulsValidationError } from '../errors.ts';
export function weight(value: number | null | undefined): number | null {
	if (value == null) return null;
	if (!Number.isFinite(value) || value < 0 || value > 1)
		throw new SoulsValidationError('weight must be between 0 and 1 or null');
	return value;
}
