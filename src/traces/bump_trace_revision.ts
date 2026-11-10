import type { SoulsDb } from '../database.ts';
export function bump(db: SoulsDb, id: number, now: number): void {
	db.prepare('UPDATE soul_traces SET revision=revision+1, updated_at=? WHERE id=?').run(now, id);
}
