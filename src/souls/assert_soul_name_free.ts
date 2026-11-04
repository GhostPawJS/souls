import type { SoulsDb } from '../database.ts';
import { SoulsConflictError, SoulsStateError } from '../errors.ts';

export function assertSoulNameFree(
	db: SoulsDb,
	fields: {
		name?: string | null | undefined;
		slug?: string | null | undefined;
		externalId?: string | null | undefined;
	},
	exceptId?: number,
): void {
	if (fields.externalId != null) {
		const row = db
			.prepare('SELECT id, name FROM souls WHERE external_id = ? AND id != ?')
			.get<{ id: number; name: string }>(fields.externalId, exceptId ?? -1);
		if (row)
			throw new SoulsConflictError(
				`External id "${fields.externalId}" is already bound to soul ${row.id} (${row.name}).`,
			);
	}
	for (const column of ['name', 'slug'] as const) {
		const value = fields[column];
		if (value == null) continue;
		const row = db
			.prepare(`SELECT id FROM souls WHERE ${column} = ? AND deleted_at IS NULL AND id != ?`)
			.get<{ id: number }>(value, exceptId ?? -1);
		if (row)
			throw new SoulsStateError(
				`A soul with ${column} "${value}" already exists (ID ${row.id}); choose a different ${column}.`,
			);
	}
}
