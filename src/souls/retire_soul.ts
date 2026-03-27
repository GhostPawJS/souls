import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { resolveNow } from '../resolve_now.ts';
import { getSoulOrThrow } from './get_soul_or_throw.ts';
import type { SoulRecord } from './types.ts';

export function retireSoul(db: SoulsDb, id: number, options?: { now?: number }): SoulRecord {
	const soul = getSoulOrThrow(db, id);
	if (soul.isDormant) throw new SoulsStateError(`Soul ${id} is already dormant.`);

	const now = resolveNow(options?.now);
	db.prepare('UPDATE souls SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
	return getSoulOrThrow(db, id);
}
