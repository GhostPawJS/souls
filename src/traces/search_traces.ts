import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { getTrace } from './get_trace.ts';
import { traceFilters } from './trace_filters.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import type { ListTracesOptions, Trace } from './types.ts';

export function searchTraces(db: SoulsDb, options: ListTracesOptions & { query: string }) {
	if (typeof options.query !== 'string') throw new SoulsValidationError('query is required');
	const limit = options.all ? 2147483647 : (options.limit ?? 20);
	const offset = options.offset ?? 0;
	if (!Number.isSafeInteger(limit) || limit < 0 || !Number.isSafeInteger(offset) || offset < 0)
		throw new SoulsValidationError('limit and offset must be non-negative integers');
	if (!traceTablesExist(db))
		return { traces: [], total: 0, truncated: false, next: null, mode: 'substring' as const };
	const { query: _query, ...filters } = options;
	const { where, args } = traceFilters(db, filters);
	const run = (mode: 'fts' | 'substring') => {
		const fts = mode === 'fts';
		const terms = options.query
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map((token) => {
				const prefix = token.endsWith('*') && token.length > 1;
				const word = prefix ? token.slice(0, -1) : token;
				return `"${word.replaceAll('"', '""')}"${prefix ? '*' : ''}`;
			})
			.join(' AND ');
		const pattern = `%${options.query.replace(/[\\%_]/g, '\\$&')}%`;
		const condition = fts
			? 'soul_traces_fts MATCH ?'
			: "(t.text LIKE ? ESCAPE '\\' OR t.settle_reason LIKE ? ESCAPE '\\')";
		const params = [...args, ...(fts ? [terms] : [pattern, pattern])];
		const sql = `FROM soul_traces t ${fts ? 'JOIN soul_traces_fts ON soul_traces_fts.rowid=t.id' : ''} WHERE ${[...where, condition].join(' AND ')}`;
		const total = db.prepare(`SELECT count(*) AS n ${sql}`).get<{ n: number }>(...params)?.n ?? 0;
		const traces = db
			.prepare(
				`SELECT t.id, ${fts ? 'bm25(soul_traces_fts)' : 'NULL'} AS rank ${sql} ORDER BY ${fts ? 'rank ASC,' : ''}t.updated_at DESC,t.id LIMIT ? OFFSET ?`,
			)
			.all<{ id: number; rank: number | null }>(...params, limit, offset)
			.map((row) => ({ ...(getTrace(db, row.id) as Trace), rank: row.rank }));
		const truncated = offset + traces.length < total;
		return { traces, total, truncated, next: truncated ? offset + traces.length : null, mode };
	};
	if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='soul_traces_fts'").get()) {
		try {
			return run('fts');
		} catch {
			/* Older stores and unavailable MATCH use the read-only fallback. */
		}
	}
	return run('substring');
}
