import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { withTransaction } from '../with_transaction.ts';
import { getShardOrThrow } from './get_shard_or_throw.ts';

export function withdrawShard(
	db: SoulsDb,
	id: number,
	options: { reason?: string; by?: number; now?: number },
) {
	return withTransaction(db, () => {
		const shard = getShardOrThrow(db, id);
		if (shard.withdrawnAt !== undefined)
			throw new SoulsValidationError('Shard is already retracted or superseded.');
		if (options.by !== undefined) {
			if (options.by === id)
				throw new SoulsValidationError('A shard cannot supersede itself.');
			const replacement = getShardOrThrow(db, options.by);
			if (replacement.withdrawnAt !== undefined)
				throw new SoulsValidationError('Replacement shard is withdrawn.');
		} else if (!options.reason?.trim()) {
			throw new SoulsValidationError('Retraction requires a reason.');
		}
		const now = options.now ?? Date.now();
		db.prepare(
			'UPDATE soul_shards SET withdrawn_at=?, withdrawal_reason=?, superseded_by=?, updated_at=? WHERE id=?',
		).run(now, options.reason ?? null, options.by ?? null, now, id);
		return getShardOrThrow(db, id);
	});
}
