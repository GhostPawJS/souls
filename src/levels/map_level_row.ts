import type { LevelRecord, LevelRow } from './types.ts';

export function mapLevelRow(row: LevelRow): LevelRecord {
	return {
		id: row.id,
		soulId: row.soul_id,
		level: row.level,
		essenceBefore: row.essence_before,
		essenceAfter: row.essence_after,
		traitsConsolidated: JSON.parse(row.traits_consolidated) as number[],
		traitsPromoted: JSON.parse(row.traits_promoted) as number[],
		traitsCarried: JSON.parse(row.traits_carried) as number[],
		traitsMerged: JSON.parse(row.traits_merged) as number[],
		createdAt: row.created_at,
	};
}
