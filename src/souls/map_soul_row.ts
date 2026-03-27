import type { SoulRecord, SoulRow } from './types.ts';

export function mapSoulRow(row: SoulRow): SoulRecord {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		essence: row.essence,
		description: row.description,
		level: row.level,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		lastAttunedAt: row.last_attuned_at,
		isDormant: row.deleted_at !== null,
	};
}
