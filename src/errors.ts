export class SoulsError extends Error {
	override name: string = 'SoulsError';
}

export class SoulsNotFoundError extends SoulsError {
	override name: string = 'SoulsNotFoundError';
}

export class SoulsValidationError extends SoulsError {
	override name: string = 'SoulsValidationError';
}

export class SoulsStateError extends SoulsError {
	override name: string = 'SoulsStateError';
}

export function isSoulsError(value: unknown): value is SoulsError {
	return value instanceof SoulsError;
}
