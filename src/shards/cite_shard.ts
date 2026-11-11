import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { getShardOrThrow } from './get_shard_or_throw.ts';
import type { ShardRecord } from './types.ts';

export function citeShard(
	db: SoulsDb,
	shardId: number,
	traitId: number,
	options?: { now?: number | undefined },
): ShardRecord {
	if (getShardOrThrow(db, shardId).withdrawnAt !== undefined)
		throw new SoulsValidationError('Cannot cite a retracted or superseded shard.');
	db.prepare(
		`INSERT OR IGNORE INTO shard_citations (shard_id, trait_id, created_at) VALUES (?, ?, ?)`,
	).run(shardId, traitId, options?.now ?? Date.now());
	return getShardOrThrow(db, shardId);
}
