import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { resolveNow } from '../resolve_now.ts';
import { getSoulOrThrow } from './get_soul_or_throw.ts';
import type { AwakenSoulOptions, SoulRecord } from './types.ts';
import { assertSoulName } from './validators.ts';

export function awakenSoul(db: SoulsDb, id: number, options?: AwakenSoulOptions): SoulRecord {
	const soul = getSoulOrThrow(db, id);
	if (!soul.isDormant) throw new SoulsStateError(`Soul ${id} is not dormant.`);

	if (options?.name !== undefined) assertSoulName(options.name);
	const now = resolveNow(options?.now);

	db.prepare(
		`UPDATE souls SET deleted_at = NULL, name = COALESCE(?, name), updated_at = ? WHERE id = ?`,
	).run(options?.name ?? null, now, id);

	return getSoulOrThrow(db, id);
}
