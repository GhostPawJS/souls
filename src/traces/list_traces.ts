import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { getTrace } from './get_trace.ts';
import { roleCode } from './role_code.ts';
import { traceEdges } from './trace_edges.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import { time } from './trace_time.ts';
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
	const where: string[] = [];
	const args: unknown[] = [];
	if (!options.includeSuperseded)
		where.push(
			`NOT EXISTS (SELECT 1 FROM (${traceEdges(db)}) successor WHERE successor.parent=t.id)`,
		);
	if (!options.includeRetired)
		where.push(
			'EXISTS (SELECT 1 FROM soul_trace_souls l JOIN souls s ON s.id=l.soul_id WHERE l.trace_id=t.id AND s.deleted_at IS NULL)',
		);
	if (options.soulId !== undefined || options.role !== undefined) {
		const clauses = ['l.trace_id=t.id'];
		if (!options.includeRetired)
			clauses.push('EXISTS (SELECT 1 FROM souls s WHERE s.id=l.soul_id AND s.deleted_at IS NULL)');
		if (options.soulId !== undefined) {
			clauses.push('l.soul_id=?');
			args.push(options.soulId);
		}
		if (options.role !== undefined) {
			clauses.push('l.role=?');
			args.push(roleCode(options.role));
		}
		where.push(`EXISTS (SELECT 1 FROM soul_trace_souls l WHERE ${clauses.join(' AND ')})`);
	}
	if (options.state !== undefined) {
		const state = ['open', 'done', 'dropped'].indexOf(options.state);
		if (state < 0) throw new SoulsValidationError('state must be open|done|dropped');
		where.push('t.state=?');
		args.push(state);
	}
	for (const tag of options.excludeTags ?? []) {
		where.push('NOT EXISTS (SELECT 1 FROM soul_trace_tags g WHERE g.trace_id=t.id AND g.tag=?)');
		args.push(tag.toLowerCase().trim());
	}
	const prefix =
		options.tagPrefix ?? (options.tag?.endsWith('*') ? options.tag.slice(0, -1) : undefined);
	if (prefix !== undefined) {
		where.push(
			'EXISTS (SELECT 1 FROM soul_trace_tags g WHERE g.trace_id=t.id AND substr(g.tag,1,length(?))=?)',
		);
		args.push(prefix.toLowerCase().trim(), prefix.toLowerCase().trim());
	}
	if (options.tag !== undefined && !options.tag.endsWith('*')) {
		where.push('EXISTS (SELECT 1 FROM soul_trace_tags g WHERE g.trace_id=t.id AND g.tag=?)');
		args.push(options.tag.toLowerCase().trim());
	}
	if (options.dueBefore !== undefined) {
		where.push('t.due_at<=?');
		args.push(time(options.dueBefore, 'dueBefore', options));
	}
	if (options.query !== undefined) {
		where.push('instr(lower(t.text),lower(?))>0');
		args.push(options.query);
	}
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
