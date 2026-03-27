import type { SoulsDb } from '../database.ts';
import { mapTraitRow } from './map_trait_row.ts';
import type { TraitRecord, TraitRow } from './types.ts';

export function getTrait(db: SoulsDb, id: number): TraitRecord | undefined {
	const row = db.prepare('SELECT * FROM soul_traits WHERE id = ?').get<TraitRow>(id);
	return row ? mapTraitRow(row) : undefined;
}
