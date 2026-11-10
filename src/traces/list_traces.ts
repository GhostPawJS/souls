import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { getTrace } from './get_trace.ts';
import { traceFilters } from './trace_filters.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import type { ListTracesOptions, Trace } from './types.ts';
export function listTraces(
	db: SoulsDb,
	options: ListTracesOptions = {},
): { traces: Trace[]; total: number; truncated: boolean; next: number | null } {
	const limit = options.all ? 2147483647 : (options.limit ?? 100);
	const offset = options.offset ?? 0;
	if (!Number.isSafeInteger(limit) || limit < 0 || !Number.isSafeInteger(offset) || offset < 0)
		throw new SoulsValidationError('limit and offset must be non-negative integers');
	if (!traceTablesExist(db)) return { traces: [], total: 0, truncated: false, next: null };
	const { where, args } = traceFilters(db, options);
	const sql = `FROM soul_traces t ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;
	const total = db.prepare(`SELECT count(*) AS n ${sql}`).get<{ n: number }>(...args)?.n ?? 0;
	const traces = db
		.prepare(`SELECT t.id ${sql} ORDER BY t.updated_at DESC,t.id DESC LIMIT ? OFFSET ?`)
		.all<{ id: number }>(...args, limit, offset)
		.map((r) => getTrace(db, r.id) as Trace);
	return {
		traces,
		total,
		truncated: offset + traces.length < total,
		next: offset + traces.length < total ? offset + traces.length : null,
	};
}
