import type { SoulsDb } from '../database.ts';
import type { ShardRecord, ShardRow } from './types.ts';

interface ShardSoulRow {
	soul_id: number;
}

interface ShardCitationRow {
	trait_id: number;
}

interface ShardTagRow {
	tag: string;
}

export function mapShardRow(db: SoulsDb, row: ShardRow): ShardRecord {
	const soulIds = db
		.prepare('SELECT soul_id FROM shard_souls WHERE shard_id = ?')
		.all<ShardSoulRow>(row.id)
		.map((r) => r.soul_id);

	const traitIds = db
		.prepare('SELECT trait_id FROM shard_citations WHERE shard_id = ?')
		.all<ShardCitationRow>(row.id)
		.map((r) => r.trait_id);

	const tags = db
		.prepare('SELECT tag FROM shard_tags WHERE shard_id = ? ORDER BY tag ASC')
		.all<ShardTagRow>(row.id)
		.map((r) => r.tag);

	return {
		id: row.id,
		content: row.content,
		source: row.source,
		status: row.status,
		sealed: row.sealed === 1,
		soulIds,
		traitIds,
		tags,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}
