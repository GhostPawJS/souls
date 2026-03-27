import { SoulsValidationError } from '../errors.ts';

export function assertShardContent(content: string): void {
	if (content.trim().length === 0) {
		throw new SoulsValidationError('Shard content must not be empty.');
	}
}

export function assertShardSource(source: string): void {
	if (source.trim().length === 0) {
		throw new SoulsValidationError('Shard source must not be empty.');
	}
}

export function assertSoulIds(soulIds: number[]): void {
	if (soulIds.length === 0) {
		throw new SoulsValidationError('At least one soulId is required per shard.');
	}
}
