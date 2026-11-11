import type { SoulsDb } from '../database.ts';
import { ancestorQuery } from './ancestor_query.ts';
import { getTrace } from './get_trace.ts';
import { traceEdges } from './trace_edges.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import type { Trace } from './types.ts';
export function traceChain(db: SoulsDb, id: number): { traces: Trace[]; certainty: number | null } {
	if (!traceTablesExist(db)) return { traces: [], certainty: null };
	const edges = traceEdges(db);
	const rows = db
		.prepare(
			`WITH RECURSIVE edges AS (${edges}), successors(id,depth) AS (SELECT id,0 FROM soul_traces WHERE id=? UNION ALL SELECT e.child,s.depth+1 FROM edges e JOIN successors s ON e.parent=s.id WHERE s.depth<1000) SELECT id FROM successors ORDER BY depth DESC LIMIT 1`,
		)
		.all<{ id: number }>(id);
	const head = rows[0]?.id;
	if (head === undefined) return { traces: [], certainty: null };
	const ancestors = db
		.prepare(
			`${ancestorQuery(db)} SELECT id,min(depth) AS depth FROM chain GROUP BY id ORDER BY depth,id`,
		)
		.all<{ id: number; depth: number }>(head);
	const traces = ancestors.map((r) => getTrace(db, r.id) as Trace);
	const denominator = ancestors.reduce((n, r) => n + 0.5 ** r.depth, 0);
	return {
		traces,
		certainty:
			traces.reduce((n, t, i) => n + (t.weight ?? 1) * 0.5 ** (ancestors[i]?.depth ?? 0), 0) /
			denominator,
	};
}
