import type { SoulsDb } from '../database.ts';
export function traceTablesExist(db: SoulsDb): boolean {
	return (
		db
			.prepare(
				"SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('soul_traces','soul_trace_souls','soul_trace_tags','soul_trace_revisions','shard_traces')",
			)
			.get<{ n: number }>()?.n === 5
	);
}
