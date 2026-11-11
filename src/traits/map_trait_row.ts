import { projectRow } from '../lib/project_row.ts';
import type { TraitRecord, TraitRow } from './types.ts';
export function mapTraitRow(row: TraitRow): TraitRecord {
	return projectRow(row, [
		'id',
		'soul_id',
		'principle',
		'provenance',
		'generation',
		'status',
		'merged_into',
		'created_at',
		'updated_at',
	]);
}
