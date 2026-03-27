import type { TraitRecord, TraitRow } from './types.ts';

export function mapTraitRow(row: TraitRow): TraitRecord {
	return {
		id: row.id,
		soulId: row.soul_id,
		principle: row.principle,
		provenance: row.provenance,
		generation: row.generation,
		status: row.status,
		mergedInto: row.merged_into,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}
