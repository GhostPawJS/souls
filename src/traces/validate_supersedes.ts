import type { SoulsDb } from '../database.ts';
import { SoulsConflictError, SoulsNotFoundError, SoulsValidationError } from '../errors.ts';
export function validateSupersedes(db: SoulsDb, id: number | null, target: number | null): void {
	if (target === null) return;
	if (!db.prepare('SELECT id FROM soul_traces WHERE id=?').get(target))
		throw new SoulsNotFoundError(`Trace #${target} not found`);
	if (id === target) throw new SoulsValidationError('A trace cannot supersede itself');
	if (
		db
			.prepare('SELECT id FROM soul_traces WHERE supersedes=? AND (? IS NULL OR id<>?)')
			.get(target, id, id)
	)
		throw new SoulsConflictError('Trace already has a successor');
	const chain = db
		.prepare(
			`WITH RECURSIVE chain(id,supersedes,depth) AS (SELECT id,supersedes,0 FROM soul_traces WHERE id=? UNION ALL SELECT t.id,t.supersedes,c.depth+1 FROM soul_traces t JOIN chain c ON t.id=c.supersedes WHERE c.depth<1000) SELECT id,depth FROM chain`,
		)
		.all<{ id: number; depth: number }>(target);
	if (chain.some((row) => row.id === id || row.depth === 1000))
		throw new SoulsValidationError('Supersedes cycle or chain depth exceeds 1000');
}
