import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { getShardOrThrow } from '../shards/get_shard_or_throw.ts';
import { changeTrace } from './change_trace.ts';
import type { Trace, TraceOptions } from './types.ts';
export function citeTrace(
	db: SoulsDb,
	shardId: number,
	traceId: number,
	options: TraceOptions & { reason?: string } = {},
): Trace & { shardId: number } {
	const trace = changeTrace(db, traceId, 'cite', options, (now) => {
		if (getShardOrThrow(db, shardId).withdrawnAt !== undefined)
			throw new SoulsValidationError('Cannot cite a retracted or superseded shard.');
		db.prepare('INSERT OR IGNORE INTO shard_traces VALUES (?,?,?)').run(shardId, traceId, now);
	});
	return { ...trace, shardId };
}
