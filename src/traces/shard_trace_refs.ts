import type { SoulsDb } from '../database.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import type { TraceState } from './types.ts';
export function shardTraceRefs(db: SoulsDb, shardId: number): { id: number; state: TraceState }[] {
	if (!traceTablesExist(db)) return [];
	return db
		.prepare(
			'SELECT t.id,t.state FROM soul_traces t JOIN shard_traces st ON st.trace_id=t.id WHERE st.shard_id=? ORDER BY t.id',
		)
		.all<{ id: number; state: number }>(shardId)
		.map((r) => ({ id: r.id, state: ['open', 'done', 'dropped'][r.state] as TraceState }));
}
