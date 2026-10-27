import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';

export function assertSoulNameFree(
	db: SoulsDb,
	fields: { name?: string | null | undefined; slug?: string | null | undefined },
	exceptId?: number,
): void {
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
