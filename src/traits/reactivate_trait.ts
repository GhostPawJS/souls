import { resolveStrict } from '../config.ts';
import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { resolveNow } from '../resolve_now.ts';
import { countActiveTraits } from './count_active_traits.ts';
import { getTraitLimit } from './get_trait_limit.ts';
import { getTraitOrThrow } from './get_trait_or_throw.ts';
import type { TraitRecord } from './types.ts';

export function reactivateTrait(
	db: SoulsDb,
	id: number,
	options?: { now?: number; strict?: boolean; traitLimit?: number },
): TraitRecord {
	const trait = getTraitOrThrow(db, id);
	if (trait.status === 'active') {
		throw new SoulsStateError(`Trait ${id} is already active.`);
	}

	const warnings =
		countActiveTraits(db, trait.soulId) >= getTraitLimit(options)
			? ['Soul is at the trait limit. Level up before reactivating traits.']
			: [];
	if (resolveStrict(db, options?.strict) && warnings.length)
		throw new SoulsStateError(warnings[0] as string);
	const now = resolveNow(options?.now);
	db.prepare(`UPDATE soul_traits SET status = 'active', updated_at = ? WHERE id = ?`).run(now, id);
	return { ...getTraitOrThrow(db, id), ...(warnings.length ? { warnings } : {}) };
}
