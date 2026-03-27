import type { SoulsDb } from '../database.ts';
import { resolveNow } from '../resolve_now.ts';
import { getSoulOrThrow } from './get_soul_or_throw.ts';
import type { SoulRecord } from './types.ts';

export function stampAttuned(db: SoulsDb, id: number, options?: { now?: number }): SoulRecord {
	getSoulOrThrow(db, id);
	const now = resolveNow(options?.now);
	db.prepare('UPDATE souls SET last_attuned_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
	return getSoulOrThrow(db, id);
}
