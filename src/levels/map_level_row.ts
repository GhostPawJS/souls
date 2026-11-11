import { projectRow } from '../lib/project_row.ts';
import type { LevelRecord, LevelRow } from './types.ts';

export function mapLevelRow(row: LevelRow): LevelRecord {
	return {
		...projectRow<Pick<LevelRecord, 'id' | 'soulId' | 'level' | 'essenceBefore' | 'essenceAfter'>>(
			row,
			['id', 'soul_id', 'level', 'essence_before', 'essence_after'],
		),
		traitsConsolidated: JSON.parse(row.traits_consolidated) as number[],
		traitsPromoted: JSON.parse(row.traits_promoted) as number[],
		traitsCarried: JSON.parse(row.traits_carried) as number[],
		traitsMerged: JSON.parse(row.traits_merged) as number[],
		createdAt: row.created_at,
	};
}
