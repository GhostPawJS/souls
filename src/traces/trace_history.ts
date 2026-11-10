import type { SoulsDb } from '../database.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import type { Trace } from './types.ts';
export interface TraceRevision {
	id: number;
	traceId: number;
	revision: number;
	kind: string;
	snapshot: Trace;
	reason: string | null;
	createdAt: number;
}
export function traceHistory(db: SoulsDb, id: number): TraceRevision[] {
	if (!traceTablesExist(db)) return [];
	return db
		.prepare('SELECT * FROM soul_trace_revisions WHERE trace_id=? ORDER BY revision')
		.all<{
			id: number;
			trace_id: number;
			revision: number;
			kind: string;
			snapshot: string;
			reason: string | null;
			created_at: number;
		}>(id)
		.map((r) => ({
			id: r.id,
			traceId: r.trace_id,
			revision: r.revision,
			kind: r.kind,
			snapshot: JSON.parse(r.snapshot) as Trace,
			reason: r.reason,
			createdAt: r.created_at,
		}));
}
