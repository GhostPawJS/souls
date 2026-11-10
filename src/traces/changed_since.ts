import type { SoulsDb } from '../database.ts';
import { listTraces } from './list_traces.ts';
import { clock } from './trace_clock.ts';
import { time } from './trace_time.ts';
import type { TraceOptions, TraceTime } from './types.ts';
export function changedSince(db: SoulsDb, since: TraceTime, options: TraceOptions = {}) {
	const cursor = clock(options);
	const start = time(since, 'since', options);
	const traces = listTraces(db, {
		includeRetired: true,
		includeSuperseded: true,
		limit: 2147483647,
	}).traces.filter((t) => t.updatedAt > start && t.updatedAt <= cursor);
	const newlyDue = listTraces(db, { state: 'open', limit: 2147483647 }).traces.filter(
		(t) => t.dueAt !== null && t.dueAt > start && t.dueAt <= cursor,
	);
	const shards = db
		.prepare(
			'SELECT * FROM soul_shards WHERE updated_at>? AND updated_at<=? ORDER BY updated_at,id',
		)
		.all(start, cursor);
	const tables = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table'")
		.all<{ name: string }>()
		.map((r) => r.name);
	const changes: Record<string, unknown[]> = {};
	for (const table of ['soul_revisions', 'soul_levels']) {
		if (!tables.includes(table)) continue;
		const columns = db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
		const date = columns.find((c) => c.name === 'created_at')?.name;
		if (date)
			changes[table] = db
				.prepare(`SELECT * FROM ${table} WHERE ${date}>? AND ${date}<=? ORDER BY ${date}`)
				.all(start, cursor);
	}
	const attunements = db
		.prepare(
			'SELECT id,last_attuned_at FROM souls WHERE last_attuned_at>? AND last_attuned_at<=? ORDER BY last_attuned_at,id',
		)
		.all(start, cursor);
	return { traces, shards, ...changes, attunements, newlyDue, cursor };
}
