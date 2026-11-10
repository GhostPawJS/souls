import type { SoulsDb } from '../database.ts';
import { SoulsConflictError, SoulsNotFoundError, SoulsValidationError } from '../errors.ts';
import { traceEdges } from './trace_edges.ts';
export function validateSupersedes(db: SoulsDb, id: number | null, target: number | null): void {
	if (target === null) return;
	if (!db.prepare('SELECT id FROM soul_traces WHERE id=?').get(target))
		throw new SoulsNotFoundError(`Trace #${target} not found`);
	if (id === target) throw new SoulsValidationError('A trace cannot supersede itself');
	const edges = traceEdges(db);
	if (
		db
			.prepare(`SELECT child FROM (${edges}) WHERE parent=? AND (? IS NULL OR child<>?)`)
			.get(target, id, id)
	)
		throw new SoulsConflictError('Trace already has a successor');
	const chain = db
		.prepare(
			`WITH RECURSIVE edges AS (${edges}), chain(id,depth) AS (SELECT ?,0 UNION ALL SELECT e.parent,c.depth+1 FROM edges e JOIN chain c ON e.child=c.id WHERE c.depth<1000) SELECT id,depth FROM chain`,
		)
		.all<{ id: number; depth: number }>(target);
	if (chain.some((row) => row.id === id || row.depth === 1000))
		throw new SoulsValidationError('Supersedes cycle or chain depth exceeds 1000');
}
