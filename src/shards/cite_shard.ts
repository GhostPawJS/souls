import type { SoulsDb } from '../database.ts';
import { getShardOrThrow } from './get_shard_or_throw.ts';
import type { ShardRecord } from './types.ts';

export function citeShard(db: SoulsDb, shardId: number, traitId: number): ShardRecord {
	getShardOrThrow(db, shardId);
	db.prepare(`INSERT OR IGNORE INTO shard_citations (shard_id, trait_id) VALUES (?, ?)`).run(
		shardId,
		traitId,
	);
	return getShardOrThrow(db, shardId);
}
