import type { SoulsDb } from '../database.ts';
export function traceEdges(db: SoulsDb): string {
	return `SELECT id AS child,supersedes AS parent FROM soul_traces WHERE supersedes IS NOT NULL${db.prepare("SELECT name FROM sqlite_master WHERE name='soul_trace_merges'").get() ? ' UNION ALL SELECT trace_id,parent_id FROM soul_trace_merges' : ''}`;
}
