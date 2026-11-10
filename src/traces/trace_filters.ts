import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { roleCode } from './role_code.ts';
import { traceEdges } from './trace_edges.ts';
import { time } from './trace_time.ts';
import type { ListTracesOptions } from './types.ts';
export function traceFilters(db: SoulsDb, options: ListTracesOptions) {
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

	for (const tag of options.tags ?? []) {
		where.push('EXISTS (SELECT 1 FROM soul_trace_tags g WHERE g.trace_id=t.id AND g.tag=?)');
		args.push(tag.toLowerCase().trim());
	}
	return { where, args };
}
