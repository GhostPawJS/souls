import type { SoulsDb } from '../database.ts';

/** Insert an active trait at the requested generation; callers own validation and revisions. */
export function insertTrait(
	db: SoulsDb,
	soulId: number,
	principle: string,
	provenance: string,
	generation: number,
	now: number,
): number {
	return Number(
		db
			.prepare(
				"INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)",
			)
			.run(soulId, principle, provenance, generation, now, now).lastInsertRowid,
	);
}
