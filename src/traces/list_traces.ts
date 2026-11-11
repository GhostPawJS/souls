import type { SoulsDb } from '../database.ts';
import { getTrace } from './get_trace.ts';
import { traceFilters } from './trace_filters.ts';
import { tracePage, tracePageBounds } from './trace_page.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import type { ListTracesOptions, Trace } from './types.ts';
export function listTraces(
	db: SoulsDb,
	options: ListTracesOptions = {},
): { traces: Trace[]; total: number; truncated: boolean; next: number | null } {
	const { limit, offset } = tracePageBounds(options);
	if (!traceTablesExist(db)) return { traces: [], total: 0, truncated: false, next: null };
	const { where, args } = traceFilters(db, options);
	const sql = `FROM soul_traces t ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`;
	const total = db.prepare(`SELECT count(*) AS n ${sql}`).get<{ n: number }>(...args)?.n ?? 0;
	const traces = db
		.prepare(`SELECT t.id ${sql} ORDER BY t.updated_at DESC,t.id DESC LIMIT ? OFFSET ?`)
		.all<{ id: number }>(...args, limit, offset)
		.map((r) => getTrace(db, r.id) as Trace);
	return tracePage(traces, total, offset);
}
