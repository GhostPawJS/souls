import type { SoulsDb } from '../database.ts';
import { getTrace } from './get_trace.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import type { Trace } from './types.ts';
export function traceChain(db: SoulsDb, id: number): { traces: Trace[]; certainty: number | null } {
	if (!traceTablesExist(db)) return { traces: [], certainty: null };
	const rows = db
		.prepare(
			`WITH RECURSIVE successors(id,depth) AS (SELECT id,0 FROM soul_traces WHERE id=? UNION ALL SELECT t.id,s.depth+1 FROM soul_traces t JOIN successors s ON t.supersedes=s.id WHERE s.depth<1000), chain(id,supersedes,weight,depth,factor) AS (SELECT t.id,t.supersedes,t.weight,0,1.0 FROM soul_traces t WHERE t.id=(SELECT id FROM successors ORDER BY depth DESC LIMIT 1) UNION ALL SELECT t.id,t.supersedes,t.weight,c.depth+1,c.factor*0.5 FROM soul_traces t JOIN chain c ON t.id=c.supersedes WHERE c.depth<1000) SELECT id,SUM(COALESCE(weight,1)*factor) OVER () / SUM(factor) OVER () AS certainty FROM chain ORDER BY depth`,
		)
		.all<{ id: number; certainty: number }>(id);
	return {
		traces: rows.map((r) => getTrace(db, r.id) as Trace),
		certainty: rows[0]?.certainty ?? null,
	};
}
