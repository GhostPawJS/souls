import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { listTraces } from './list_traces.ts';
import { clock } from './trace_clock.ts';
import { time } from './trace_time.ts';
import type { ListTracesOptions, TraceTime } from './types.ts';
export function changedSince(db: SoulsDb, since: TraceTime, options: ListTracesOptions = {}) {
	const cursor = clock(options);
	for (const value of [options.offset ?? 0, options.limit ?? 100])
		if (!Number.isSafeInteger(value) || value < 0)
			throw new SoulsValidationError('limit and offset must be non-negative integers');
	const start = time(since, 'since', options);
	const matching = listTraces(db, {
		...options,
		all: true,
		offset: 0,
		includeRetired: true,
		includeSuperseded: true,
		limit: 2147483647,
	}).traces.filter((t) => t.updatedAt > start && t.updatedAt <= cursor);
	const offset = options.offset ?? 0;
	const limit = options.all ? matching.length : (options.limit ?? 100);
	const traces = matching.slice(offset, offset + limit);
	const truncated = offset + traces.length < matching.length;
	const newlyDue = listTraces(db, { state: 'open', limit: 2147483647 }).traces.filter(
		(t) => t.dueAt !== null && t.dueAt > start && t.dueAt <= cursor,
	);
	const camel = (row: Record<string, unknown>) =>
		Object.fromEntries(
			Object.entries(row).map(([key, value]) => [
				key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
				value,
			]),
		);
	const shards = db
		.prepare(
			'SELECT * FROM soul_shards WHERE updated_at>? AND updated_at<=? ORDER BY updated_at,id',
		)
		.all(start, cursor)
		.map(camel);
	const tables = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table'")
		.all<{ name: string }>()
		.map((r) => r.name);
	const changes: Record<string, unknown[]> = { revisions: [], levelUps: [] };
	for (const table of ['soul_revisions', 'soul_levels']) {
		if (!tables.includes(table)) continue;
		const columns = db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
		const date = columns.find((c) => c.name === 'created_at')?.name;
		if (date)
			changes[table === 'soul_revisions' ? 'revisions' : 'levelUps'] = db
				.prepare(`SELECT * FROM ${table} WHERE ${date}>? AND ${date}<=? ORDER BY ${date}`)
				.all(start, cursor)
				.map(camel);
	}
	const attunements = db
		.prepare(
			'SELECT id,last_attuned_at FROM souls WHERE last_attuned_at>? AND last_attuned_at<=? ORDER BY last_attuned_at,id',
		)
		.all(start, cursor)
		.map(camel);
	return {
		traces,
		total: matching.length,
		truncated,
		next: truncated ? offset + traces.length : null,
		shards,
		revisions: changes.revisions ?? [],
		levelUps: changes.levelUps ?? [],
		attunements,
		newlyDue,
		cursor,
		since: start,
	};
}
