import type { SoulsDb } from '../database.ts';
import { resolveNow } from '../resolve_now.ts';
import { recordRevision } from '../revisions.ts';
import { withTransaction } from '../with_transaction.ts';
import { getTraitOrThrow } from './get_trait_or_throw.ts';
import type { ReviseTraitInput, TraitRecord } from './types.ts';
import { assertPrinciple, assertProvenance } from './validators.ts';

export function reviseTrait(db: SoulsDb, id: number, input: ReviseTraitInput): TraitRecord {
	return withTransaction(db, () => {
		const before = getTraitOrThrow(db, id);

		if (input.principle !== undefined) assertPrinciple(input.principle);
		if (input.provenance !== undefined) assertProvenance(input.provenance);

		const now = resolveNow(input.now);

		db.prepare(
			`UPDATE soul_traits SET
			principle  = COALESCE(?, principle),
			provenance = COALESCE(?, provenance),
			updated_at = ?
		 WHERE id = ?`,
		).run(input.principle ?? null, input.provenance ?? null, now, id);

		const after = getTraitOrThrow(db, id);
		if (after.principle !== before.principle || after.provenance !== before.provenance)
			recordRevision(db, 'trait', id, before.soulId, before.principle, after.principle, {
				...input,
				now,
			});
		return after;
	});
}
