import type { SoulsDb } from './database.ts';
import { SoulsConflictError, SoulsValidationError } from './errors.ts';
import type { EvidenceGateOptions } from './evidence_gate.ts';
import { evidenceGate } from './evidence_gate.ts';
import { citeShard } from './shards/cite_shard.ts';
import { stampAttuned } from './souls/stamp_attuned.ts';
import { addTrait } from './traits/add_trait.ts';
import { getTraitOrThrow } from './traits/get_trait_or_throw.ts';
import { reviseTrait } from './traits/revise_trait.ts';
import { withTransaction } from './with_transaction.ts';
export interface RefineWithEvidenceInput extends EvidenceGateOptions {
	soulId: number;
	action: 'add' | 'revise';
	traitId?: number | undefined;
	principle: string;
	provenance: string;
	shardIds: number[];
	expectedRevision?: number | undefined;
	traitLimit?: number | undefined;
}
export function refineWithEvidence(db: SoulsDb, input: RefineWithEvidenceInput) {
	return withTransaction(db, () => {
		const revision =
			db
				.prepare('SELECT COALESCE(MAX(id),0) AS id FROM soul_revisions WHERE soul_id = ?')
				.get<{ id: number }>(input.soulId)?.id ?? 0;
		if (input.expectedRevision !== undefined && revision !== input.expectedRevision)
			throw new SoulsConflictError(
				`Revision conflict: expected ${input.expectedRevision}, found ${revision}.`,
			);
		const warnings = evidenceGate(db, input.soulId, input);
		if (
			input.action === 'revise' &&
			(!input.traitId || getTraitOrThrow(db, input.traitId).soulId !== input.soulId)
		)
			throw new SoulsValidationError('traitId must belong to soulId.');
		const trait =
			input.action === 'add'
				? addTrait(
						db,
						input.soulId,
						input,
						input.traitLimit === undefined ? undefined : { traitLimit: input.traitLimit },
					)
				: reviseTrait(db, input.traitId as number, input);
		for (const shardId of input.shardIds) citeShard(db, shardId, trait.id, input);
		stampAttuned(db, input.soulId, input.now === undefined ? undefined : { now: input.now });
		const record = { ...trait };
		if (warnings.length)
			Object.defineProperty(record, 'warnings', { value: warnings, enumerable: false });
		return record;
	});
}
