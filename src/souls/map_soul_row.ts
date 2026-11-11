import { projectRow } from '../lib/project_row.ts';
import type { SoulRecord, SoulRow } from './types.ts';

export function mapSoulRow(row: SoulRow): SoulRecord {
	return {
		id: row.id,
		...(row.external_id == null ? {} : { externalId: row.external_id }),
		...projectRow<Omit<SoulRecord, 'id' | 'externalId' | 'isDormant'>>(row, [
			'name',
			'slug',
			'essence',
			'description',
			'level',
			'created_at',
			'updated_at',
			'deleted_at',
			'last_attuned_at',
		]),
		isDormant: row.deleted_at !== null,
	};
}
