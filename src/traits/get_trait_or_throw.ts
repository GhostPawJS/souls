import type { SoulsDb } from '../database.ts';
import { SoulsNotFoundError } from '../errors.ts';
import { mapTraitRow } from './map_trait_row.ts';
import type { TraitRecord, TraitRow } from './types.ts';

export function getTraitOrThrow(db: SoulsDb, id: number): TraitRecord {
	const row = db.prepare('SELECT * FROM soul_traits WHERE id = ?').get<TraitRow>(id);
	if (!row) throw new SoulsNotFoundError(`Trait not found: ${id}`);
	return mapTraitRow(row);
}
