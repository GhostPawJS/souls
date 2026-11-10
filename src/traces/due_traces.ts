import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { listTraces } from './list_traces.ts';
import { clock } from './trace_clock.ts';
import type { ListTracesOptions, Trace } from './types.ts';
export function dueTraces(
	db: SoulsDb,
	options: ListTracesOptions & { within?: string | number } = {},
): Trace[] {
	const now = clock(options);
	const within = options.within ?? '3d';
	if (typeof within === 'string' && !/^\d+(?:\.\d+)?[dh]$/.test(within))
		throw new SoulsValidationError('within must be a duration such as 3d or 12h');
	const duration =
		typeof within === 'number'
			? within
			: Number(within.slice(0, -1)) * (within.endsWith('d') ? 86400000 : 3600000);
	if (!Number.isFinite(duration) || duration < 0)
		throw new SoulsValidationError('within must be non-negative');
	return listTraces(db, {
		...options,
		state: 'open',
		dueBefore: new Date(now + duration).toISOString(),
		limit: 2147483647,
		offset: 0,
	})
		.traces.sort((a, b) => (a.dueAt as number) - (b.dueAt as number) || a.id - b.id)
		.slice(options.offset ?? 0, (options.offset ?? 0) + (options.limit ?? 100));
}
