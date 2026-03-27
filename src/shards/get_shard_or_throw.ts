import type { SoulsDb } from '../database.ts';
import { SoulsNotFoundError } from '../errors.ts';
import { mapShardRow } from './map_shard_row.ts';
import type { ShardRecord, ShardRow } from './types.ts';

export function getShardOrThrow(db: SoulsDb, id: number): ShardRecord {
	const row = db.prepare('SELECT * FROM soul_shards WHERE id = ?').get<ShardRow>(id);
	if (!row) throw new SoulsNotFoundError(`Shard not found: ${id}`);
	return mapShardRow(db, row);
}
