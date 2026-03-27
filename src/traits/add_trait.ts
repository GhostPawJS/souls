import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { resolveNow } from '../resolve_now.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { countActiveTraits } from './count_active_traits.ts';
import { getTraitLimit } from './get_trait_limit.ts';
import { getTraitOrThrow } from './get_trait_or_throw.ts';
import type { AddTraitInput, TraitRecord } from './types.ts';
import { assertPrinciple, assertProvenance } from './validators.ts';

export function addTrait(
	db: SoulsDb,
	soulId: number,
	input: AddTraitInput,
	options?: { traitLimit?: number },
): TraitRecord {
	assertPrinciple(input.principle);
	assertProvenance(input.provenance);

	const soul = getSoulOrThrow(db, soulId);
	const limit = getTraitLimit(options);
	const count = countActiveTraits(db, soulId);

	if (count >= limit) {
		throw new SoulsStateError(
			`Soul ${soulId} is at the trait limit (${limit}). Level up before adding more traits.`,
		);
	}

	const now = resolveNow(input.now);

	const result = db
		.prepare(
			`INSERT INTO soul_traits (soul_id, principle, provenance, generation, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, 'active', ?, ?)`,
		)
		.run(soulId, input.principle, input.provenance, soul.level, now, now);

	return getTraitOrThrow(db, Number(result.lastInsertRowid));
}
