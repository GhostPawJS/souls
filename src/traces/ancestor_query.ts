import type { SoulsDb } from '../database.ts';
import { traceEdges } from './trace_edges.ts';

/** Shared ancestor walk, including its depth guard, for validation and chain rendering. */
export function ancestorQuery(db: SoulsDb): string {
	return `WITH RECURSIVE edges AS (${traceEdges(db)}), chain(id,depth) AS (SELECT ?,0 UNION ALL SELECT e.parent,c.depth+1 FROM edges e JOIN chain c ON e.child=c.id WHERE c.depth<1000)`;
}
