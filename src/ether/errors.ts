import { SoulsError } from '../errors.ts';

export class EtherError extends SoulsError {
	override name: string = 'EtherError';
}

export class EtherFetchError extends EtherError {
	override name: string = 'EtherFetchError';
}

export class EtherParseError extends EtherError {
	override name: string = 'EtherParseError';
}

export class EtherNotFoundError extends EtherError {
	override name: string = 'EtherNotFoundError';
}

export function isEtherError(value: unknown): value is EtherError {
	return value instanceof EtherError;
}
