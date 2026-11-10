import { SoulsValidationError } from '../errors.ts';
import { detectCredential } from '../lib/detect_credential.ts';
export function safeText(value: string, field: string): string {
	if (typeof value !== 'string' || !value.trim())
		throw new SoulsValidationError(`${field} must be non-empty text`);
	if (detectCredential(value)) throw new SoulsValidationError(`${field} contains a credential`);
	return value.trim();
}
