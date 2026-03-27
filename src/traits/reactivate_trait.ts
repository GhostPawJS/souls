import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { resolveNow } from '../resolve_now.ts';
import { getTraitOrThrow } from './get_trait_or_throw.ts';
import type { TraitRecord } from './types.ts';

export function reactivateTrait(db: SoulsDb, id: number, options?: { now?: number }): TraitRecord {
	const trait = getTraitOrThrow(db, id);
	if (trait.status === 'active') {
		throw new SoulsStateError(`Trait ${id} is already active.`);
	}

	const now = resolveNow(options?.now);
	db.prepare(`UPDATE soul_traits SET status = 'active', updated_at = ? WHERE id = ?`).run(now, id);
	return getTraitOrThrow(db, id);
}
