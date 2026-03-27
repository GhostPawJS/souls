import type { SoulsDb } from '../database.ts';
import { mapTraitRow } from './map_trait_row.ts';
import type { ListTraitsOptions, TraitRecord, TraitRow } from './types.ts';

export function listTraits(
	db: SoulsDb,
	soulId: number,
	options?: ListTraitsOptions,
): TraitRecord[] {
	const conditions: string[] = ['soul_id = ?'];
	const params: (number | string)[] = [soulId];

	if (options?.status !== undefined) {
		conditions.push('status = ?');
		params.push(options.status);
	}
	if (options?.generation !== undefined) {
		conditions.push('generation = ?');
		params.push(options.generation);
	}

	const sql = `SELECT * FROM soul_traits WHERE ${conditions.join(' AND ')} ORDER BY created_at ASC`;
	return db
		.prepare(sql)
		.all<TraitRow>(...params)
		.map(mapTraitRow);
}
