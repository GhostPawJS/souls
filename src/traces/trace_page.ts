import { SoulsValidationError } from '../errors.ts';
import type { ListTracesOptions } from './types.ts';

export function tracePageBounds(options: ListTracesOptions, defaultLimit = 100, allowAll = true) {
	const limit = allowAll && options.all ? 2147483647 : (options.limit ?? defaultLimit);
	const offset = options.offset ?? 0;
	if (!Number.isSafeInteger(limit) || limit < 0 || !Number.isSafeInteger(offset) || offset < 0)
		throw new SoulsValidationError('limit and offset must be non-negative integers');
	return { limit, offset };
}
export function tracePage<T>(traces: T[], total: number, offset: number) {
	const end = offset + traces.length;
	const truncated = end < total;
	return { traces, total, truncated, next: truncated ? end : null };
}
