import { resolveStrict } from '../config.ts';
import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { evidenceGate } from '../evidence_gate.ts';
import { resolveNow } from '../resolve_now.ts';
import { recordRevision } from '../revisions.ts';
import { getShardOrThrow } from '../shards/get_shard_or_throw.ts';
import { withTransaction } from '../with_transaction.ts';
import { assertSoulNameFree } from './assert_soul_name_free.ts';
import { getSoulOrThrow } from './get_soul_or_throw.ts';
import type { SoulRecord, UpdateSoulInput } from './types.ts';
import {
	assertSlug,
	assertSoulDescription,
	assertSoulEssence,
	assertSoulName,
} from './validators.ts';

export function updateSoul(db: SoulsDb, id: number, input: UpdateSoulInput): SoulRecord {
	return withTransaction(db, () => {
		const soul = getSoulOrThrow(db, id);

		if (input.name !== undefined) assertSoulName(input.name);
		if (input.essence !== undefined) assertSoulEssence(input.essence);
		if (input.description !== undefined) assertSoulDescription(input.description);
		if (input.slug != null) assertSlug(input.slug);

		assertSoulNameFree(db, input, soul.id);
		const now = resolveNow(input.now);
		const changed = input.essence !== undefined && input.essence !== soul.essence;
		const warnings =
			changed &&
			!(input.operator?.trim() && input.reason?.trim() && !resolveStrict(db, input.strict))
				? evidenceGate(db, id, input)
				: [];
		if (changed) {
			for (const shardId of input.shardIds ?? []) {
				if (getShardOrThrow(db, shardId).withdrawnAt !== undefined)
					throw new SoulsValidationError('Cannot cite a retracted or superseded shard.');
			}
			const revisionId = recordRevision(
				db,
				'essence',
				id,
				id,
				soul.essence,
				input.essence as string,
				{ ...input, now },
			);
			// Essence evidence targets its revision; ordinary citations require a trait.
			for (const shardId of input.shardIds ?? [])
				db.prepare(
					'INSERT OR IGNORE INTO soul_revision_shards (revision_id,shard_id) VALUES (?,?)',
				).run(revisionId, shardId);
		}

		db.prepare(
			`UPDATE souls SET
			external_id = CASE WHEN ? = 1 THEN ? ELSE external_id END,
 name        = COALESCE(?, name),
			slug        = CASE WHEN ? = 1 THEN ? ELSE slug END,
			essence     = COALESCE(?, essence),
			description = COALESCE(?, description),
			updated_at  = ?
		 WHERE id = ?`,
		).run(
			'externalId' in input ? 1 : 0,
			input.externalId ?? null,
			input.name ?? null,
			'slug' in input ? 1 : 0,
			input.slug ?? null,
			input.essence ?? null,
			input.description ?? null,
			now,
			soul.id,
		);

		const record = getSoulOrThrow(db, id);
		if (warnings.length)
			Object.defineProperty(record, 'warnings', { value: warnings, enumerable: false });
		return record;
	});
}
